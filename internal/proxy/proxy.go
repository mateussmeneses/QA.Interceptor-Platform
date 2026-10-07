// Package proxy implements the local HTTP(S) interception proxy core.
//
// It relays plain HTTP (P0-01) and, when a CertProvider is supplied, performs
// TLS MITM on CONNECT so HTTPS traffic can be decrypted, captured, and later
// modified (P1-02). Rules and mocking arrive in Phase 3 (see BACKLOG.md).
package proxy

import (
	"crypto/tls"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"time"
)

// Observer is notified of each completed HTTP exchange (HTTP or decrypted
// HTTPS). The capture store and the stdout logger are observers.
type Observer interface {
	Observe(Exchange)
}

// Exchange is a single request/response pair the proxy relayed.
type Exchange struct {
	Method     string
	URL        string
	StatusCode int
	Duration   time.Duration
	Err        error
}

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

// Proxy is a forward HTTP(S) proxy. Construct it with New.
type Proxy struct {
	transport http.RoundTripper
	observer  Observer
	certs     CertProvider // nil => HTTPS tunneling is refused (Phase 0 behavior)
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
// using certs. Passing a non-nil provider turns the 501 CONNECT refusal into
// real TLS interception.
func (p *Proxy) WithMITM(certs CertProvider) *Proxy {
	clone := *p
	clone.certs = certs
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
	exchange := Exchange{Method: r.Method, URL: loggedURL}

	resp, err := p.relay(r)
	if err != nil {
		exchange.Err = err
		exchange.Duration = time.Since(start)
		p.notify(exchange)
		http.Error(w, "proxy relay error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	copyHeaders(w.Header(), resp.Header)
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)

	exchange.StatusCode = resp.StatusCode
	exchange.Duration = time.Since(start)
	p.notify(exchange)
}

// handleConnect intercepts an HTTPS tunnel. Without a CertProvider it refuses
// cleanly (Phase 0). With one, it hijacks the client connection, completes a
// TLS handshake using a per-host leaf cert, and serves the decrypted requests.
func (p *Proxy) handleConnect(w http.ResponseWriter, r *http.Request) {
	if p.certs == nil {
		http.Error(w, "HTTPS interception not enabled (no CA configured)", http.StatusNotImplemented)
		return
	}

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

	// Tell the client the tunnel is open; from here the bytes are TLS.
	if _, err := io.WriteString(clientConn, "HTTP/1.1 200 Connection Established\r\n\r\n"); err != nil {
		return
	}

	authority := r.Host         // "example.com:443" — used to dial the origin
	host := hostOnly(authority) // "example.com"     — used to select the cert

	tlsConn := tls.Server(clientConn, p.certs.TLSConfigForHost(host))
	if err := tlsConn.Handshake(); err != nil {
		// Common when the client has not trusted our CA, or closes early.
		return
	}
	defer tlsConn.Close()

	p.serveDecrypted(tlsConn, authority)
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
