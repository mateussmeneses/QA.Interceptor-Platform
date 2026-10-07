// Package proxy implements the local HTTP(S) interception proxy core.
//
// It relays plain HTTP (P0-01) and, when a CertProvider is supplied, performs
// TLS MITM on CONNECT so HTTPS traffic can be decrypted, captured, and later
// modified (P1-02). Rules and mocking arrive in Phase 3 (see BACKLOG.md).
package proxy

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"time"

	"github.com/qa-interceptor/platform/internal/rules"
)

// Observer is notified of each completed HTTP exchange (HTTP or decrypted
// HTTPS). The capture store and the stdout logger are observers.
type Observer interface {
	Observe(Exchange)
}

// Exchange is a single request/response pair the proxy relayed. Bodies are
// captured up to maxCapturedBody bytes; BodyTruncated flags when more existed.
type Exchange struct {
	Method     string
	URL        string
	StatusCode int
	Duration   time.Duration
	Err        error

	ReqHeaders  http.Header
	ReqBody     []byte
	RespHeaders http.Header
	RespBody    []byte

	ReqBodyTruncated  bool
	RespBodyTruncated bool
}

// maxCapturedBody bounds how many bytes of each body we retain in memory, so a
// large download or upload cannot exhaust memory. The relay still streams the
// full body to the client/origin; only the captured copy is truncated.
const maxCapturedBody = 256 * 1024

// ObserverFunc adapts a plain function to the Observer interface.
type ObserverFunc func(Exchange)

// Observe calls the wrapped function.
func (f ObserverFunc) Observe(e Exchange) { f(e) }

// MultiObserver fans one exchange out to several observers in order. It lets a
// single proxy both log and capture, for example.
func MultiObserver(observers ...Observer) Observer {
	return ObserverFunc(func(e Exchange) {
		for _, o := range observers {
			if o != nil {
				o.Observe(e)
			}
		}
	})
}

// CertProvider supplies a TLS server config for intercepting a CONNECT target.
// The host from the CONNECT request is passed so the provider can select a
// certificate when the client sends no SNI (e.g. IP-literal targets). It is
// satisfied by internal/mitm.LeafCache. Keeping it an interface here preserves
// the one-way dependency (proxy does not import mitm).
type CertProvider interface {
	TLSConfigForHost(host string) *tls.Config
}

// RuleEngine decides which modification rule applies to a request. It is
// satisfied by *rules.Set. Keeping it an interface preserves a clean seam and
// lets the proxy run with no rules (a nil engine).
type RuleEngine interface {
	FirstMatch(req rules.Request, wanted ...rules.ActionType) (rules.Rule, bool)
}

// Proxy is a forward HTTP(S) proxy. Construct it with New.
type Proxy struct {
	transport  http.RoundTripper
	observer   Observer
	certs      CertProvider           // nil => HTTPS CONNECT is tunneled raw, never decrypted
	shouldMITM func(host string) bool // nil => MITM every host (when certs is set)
	engine     RuleEngine             // nil => no rules applied
}

// New creates a Proxy that relays plain HTTP only. A nil observer is allowed
// (exchanges are then dropped). Use WithMITM to enable HTTPS interception.
func New(observer Observer) *Proxy {
	return &Proxy{
		transport: http.DefaultTransport,
		observer:  observer,
	}
}

// WithMITM returns a copy of the proxy that intercepts HTTPS CONNECT requests
// using certs. Passing a non-nil provider turns raw CONNECT tunneling into real
// TLS interception for hosts the tunnel decider allows.
func (p *Proxy) WithMITM(certs CertProvider) *Proxy {
	clone := *p
	clone.certs = certs
	return &clone
}

// WithTunnelDecider returns a copy of the proxy that consults shouldMITM for
// each HTTPS CONNECT host: true decrypts (MITM), false tunnels transparently
// without decryption or capture. Only consulted when a CertProvider is set; a
// nil decider means "MITM every host" (P1-03).
func (p *Proxy) WithTunnelDecider(shouldMITM func(host string) bool) *Proxy {
	clone := *p
	clone.shouldMITM = shouldMITM
	return &clone
}

// WithRules returns a copy of the proxy that applies modification rules from
// engine. A nil engine means no rules (plain relay).
func (p *Proxy) WithRules(engine RuleEngine) *Proxy {
	clone := *p
	clone.engine = engine
	return &clone
}

// ServeHTTP implements http.Handler. Plain requests are relayed to origin;
// CONNECT requests are MITM-intercepted when a CertProvider is configured.
func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodConnect {
		p.handleConnect(w, r)
		return
	}
	p.serveRelayed(w, r, "")
}

// serveRelayed relays a single plain-HTTP-style request/response and reports
// the exchange. scheme is used to build the logged URL for decrypted HTTPS
// (where r.URL has no scheme/host); pass "" for ordinary proxied HTTP.
func (p *Proxy) serveRelayed(w http.ResponseWriter, r *http.Request, urlOverride string) {
	start := time.Now()

	loggedURL := r.URL.String()
	if urlOverride != "" {
		loggedURL = urlOverride
	}
	exchange := Exchange{Method: r.Method, URL: loggedURL, ReqHeaders: r.Header.Clone()}

	// Capture the request body, then restore it so the relay still sends it.
	if r.Body != nil {
		full, _ := io.ReadAll(r.Body)
		_ = r.Body.Close()
		r.Body = io.NopCloser(bytes.NewReader(full))
		r.ContentLength = int64(len(full))
		exchange.ReqBody, exchange.ReqBodyTruncated = clampBody(full)
	}

	// Apply short-circuiting rules (block) before contacting the origin.
	if p.applyBlock(w, r, loggedURL, &exchange, start) {
		return
	}

	resp, err := p.relay(r)
	if err != nil {
		exchange.Err = err
		exchange.Duration = time.Since(start)
		p.notify(exchange)
		http.Error(w, "proxy relay error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Read the whole response body so we can both capture it and forward it.
	respBody, _ := io.ReadAll(resp.Body)
	exchange.RespHeaders = resp.Header.Clone()
	exchange.RespBody, exchange.RespBodyTruncated = clampBody(respBody)

	copyHeaders(w.Header(), resp.Header)
	w.WriteHeader(resp.StatusCode)
	_, _ = w.Write(respBody)

	exchange.StatusCode = resp.StatusCode
	exchange.Duration = time.Since(start)
	p.notify(exchange)
}

// applyBlock checks for a matching block rule and, if found, writes the block
// response, records the exchange, and returns true (the caller must stop). It
// returns false when no block rule matches (relay should proceed).
func (p *Proxy) applyBlock(w http.ResponseWriter, r *http.Request, loggedURL string, exchange *Exchange, start time.Time) bool {
	if p.engine == nil {
		return false
	}
	rule, ok := p.engine.FirstMatch(rules.Request{Method: r.Method, URL: loggedURL}, rules.ActionBlock)
	if !ok {
		return false
	}

	const blockStatus = http.StatusForbidden
	body := "blocked by rule: " + rule.Name

	exchange.StatusCode = blockStatus
	exchange.RespBody = []byte(body)
	exchange.Duration = time.Since(start)
	p.notify(*exchange)

	http.Error(w, body, blockStatus)
	return true
}

// clampBody returns at most maxCapturedBody bytes of b (copied so it does not
// alias the caller's slice) and whether truncation occurred.
func clampBody(b []byte) (captured []byte, truncated bool) {
	if len(b) <= maxCapturedBody {
		out := make([]byte, len(b))
		copy(out, b)
		return out, false
	}
	out := make([]byte, maxCapturedBody)
	copy(out, b[:maxCapturedBody])
	return out, true
}

// handleConnect handles an HTTPS CONNECT. It either decrypts the tunnel (MITM)
// or splices it through raw, depending on whether a CA is configured and what
// the tunnel decider says for this host.
func (p *Proxy) handleConnect(w http.ResponseWriter, r *http.Request) {
	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "connection hijacking unsupported", http.StatusInternalServerError)
		return
	}

	clientConn, _, err := hijacker.Hijack()
	if err != nil {
		http.Error(w, "hijack failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer clientConn.Close()

	authority := r.Host         // "example.com:443" — used to dial the origin
	host := hostOnly(authority) // "example.com"     — used to select the cert

	// Tell the client the tunnel is open; from here the bytes are TLS.
	if _, err := io.WriteString(clientConn, "HTTP/1.1 200 Connection Established\r\n\r\n"); err != nil {
		return
	}

	if p.mitmHost(host) {
		p.mitmTunnel(clientConn, authority, host)
		return
	}
	rawTunnel(clientConn, authority)
}

// mitmHost reports whether this host should be decrypted. Requires a CA; a nil
// decider means decrypt everything.
func (p *Proxy) mitmHost(host string) bool {
	if p.certs == nil {
		return false
	}
	if p.shouldMITM == nil {
		return true
	}
	return p.shouldMITM(host)
}

// mitmTunnel completes a TLS handshake with the client using a per-host leaf
// cert, then serves the decrypted requests, capturing each.
func (p *Proxy) mitmTunnel(clientConn net.Conn, authority, host string) {
	tlsConn := tls.Server(clientConn, p.certs.TLSConfigForHost(host))
	if err := tlsConn.Handshake(); err != nil {
		// Common when the client has not trusted our CA, or closes early.
		return
	}
	defer tlsConn.Close()

	p.serveDecrypted(tlsConn, authority)
}

// rawTunnel splices bytes between the client and the origin without decrypting.
// Nothing is captured — this is the pass-through path (P1-03) for hosts we do
// not MITM (e.g. certificate-pinned apps).
func rawTunnel(clientConn net.Conn, authority string) {
	originConn, err := net.DialTimeout("tcp", authority, 30*time.Second)
	if err != nil {
		return
	}
	defer originConn.Close()

	done := make(chan struct{}, 2)
	go func() { _, _ = io.Copy(originConn, clientConn); done <- struct{}{} }()
	go func() { _, _ = io.Copy(clientConn, originConn); done <- struct{}{} }()
	<-done // return as soon as either direction closes
}

// serveDecrypted reads HTTP requests off an established TLS connection and
// relays each to origin over HTTPS, reporting an exchange per request. It
// handles keep-alive: multiple requests may arrive on one connection.
func (p *Proxy) serveDecrypted(tlsConn *tls.Conn, authority string) {
	for {
		req, err := http.ReadRequest(newBufReader(tlsConn))
		if err != nil {
			return // client closed the tunnel or sent a malformed request
		}

		// The decrypted request's URL is origin-form (no scheme/host); rebuild
		// an absolute https URL (incl. port) so the shared relay dials origin.
		req.URL.Scheme = "https"
		req.URL.Host = authority
		req.RequestURI = ""

		writer := &connResponseWriter{conn: tlsConn, header: make(http.Header)}
		p.serveRelayed(writer, req, req.URL.String())
		writer.flush()

		if req.Close || req.Header.Get("Connection") == "close" {
			return
		}
	}
}

// relay builds an outbound request from the inbound one and sends it to origin.
func (p *Proxy) relay(r *http.Request) (*http.Response, error) {
	outReq := r.Clone(r.Context())
	outReq.RequestURI = ""
	removeHopByHopHeaders(outReq.Header)
	return p.transport.RoundTrip(outReq)
}

func (p *Proxy) notify(e Exchange) {
	if p.observer != nil {
		p.observer.Observe(e)
	}
}

// StdoutLogger returns an Observer that logs each exchange to the standard
// logger, in a compact one-line form.
func StdoutLogger() Observer {
	return ObserverFunc(func(e Exchange) {
		if e.Err != nil {
			log.Printf("%-6s %s -> error: %v (%s)", e.Method, e.URL, e.Err, e.Duration.Round(time.Millisecond))
			return
		}
		log.Printf("%-6s %s -> %d (%s)", e.Method, e.URL, e.StatusCode, e.Duration.Round(time.Millisecond))
	})
}

// copyHeaders copies all header values from src into dst.
func copyHeaders(dst, src http.Header) {
	for key, values := range src {
		for _, v := range values {
			dst.Add(key, v)
		}
	}
}

// hopByHopHeaders are connection-scoped and must not be forwarded to the origin
// (RFC 7230 §6.1).
var hopByHopHeaders = []string{
	"Connection",
	"Proxy-Connection",
	"Keep-Alive",
	"Proxy-Authenticate",
	"Proxy-Authorization",
	"Te",
	"Trailer",
	"Transfer-Encoding",
	"Upgrade",
}

func removeHopByHopHeaders(h http.Header) {
	for _, name := range hopByHopHeaders {
		h.Del(name)
	}
}

func hostOnly(hostPort string) string {
	if h, _, err := net.SplitHostPort(hostPort); err == nil {
		return h
	}
	return hostPort
}

// ListenAndServe starts a proxy server on addr (host:port) with the given
// handler and returns the running *http.Server for graceful shutdown. The
// handler is typically a *Proxy (optionally WithMITM).
func ListenAndServe(addr string, handler http.Handler) (*http.Server, error) {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("listen on %s: %w", addr, err)
	}

	srv := &http.Server{Handler: handler}
	go func() {
		if serveErr := srv.Serve(ln); serveErr != nil && serveErr != http.ErrServerClosed {
			log.Printf("proxy server stopped: %v", serveErr)
		}
	}()
	return srv, nil
}
