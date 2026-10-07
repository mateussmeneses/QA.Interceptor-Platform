// Package proxy implements the local HTTP interception proxy core.
//
// Phase 0 scope (P0-01): a forward proxy that relays plain HTTP requests to
// their origin and returns the response to the client, logging each exchange.
// HTTPS MITM, rules, and mocking arrive in later phases (see BACKLOG.md).
package proxy

import (
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"time"
)

// Observer is notified of each completed HTTP exchange. Phase 0 uses it to log
// to stdout; later phases will plug the capture store in here.
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

// Proxy is a forward HTTP proxy. Construct it with New.
type Proxy struct {
	transport http.RoundTripper
	observer  Observer
}

// New creates a Proxy. A nil observer is allowed (exchanges are then dropped).
func New(observer Observer) *Proxy {
	return &Proxy{
		transport: http.DefaultTransport,
		observer:  observer,
	}
}

// ServeHTTP relays a proxied HTTP request to its origin and copies the response
// back to the client. It implements http.Handler so it can be mounted on an
// http.Server.
func (p *Proxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// A CONNECT request is the client asking to tunnel HTTPS. Phase 0 does not
	// intercept TLS, so reject it clearly instead of mishandling it. P1 adds it.
	if r.Method == http.MethodConnect {
		http.Error(w, "HTTPS interception not supported yet (see BACKLOG P1)", http.StatusNotImplemented)
		return
	}

	start := time.Now()
	exchange := Exchange{Method: r.Method, URL: r.URL.String()}

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

// relay builds an outbound request from the inbound one and sends it to origin.
func (p *Proxy) relay(r *http.Request) (*http.Response, error) {
	outReq := r.Clone(r.Context())
	// RequestURI is set on server-side requests and must be cleared before the
	// request can be used as a client request.
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

// ListenAndServe starts a forward-proxy server on addr (host:port) and blocks
// until the server stops. Use the returned *http.Server for graceful shutdown.
func ListenAndServe(addr string, observer Observer) (*http.Server, error) {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("listen on %s: %w", addr, err)
	}

	srv := &http.Server{Handler: New(observer)}
	go func() {
		if serveErr := srv.Serve(ln); serveErr != nil && serveErr != http.ErrServerClosed {
			log.Printf("proxy server stopped: %v", serveErr)
		}
	}()
	return srv, nil
}
