package proxy

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

// TestProxyRelaysAndObserves starts a real origin server and a real proxy
// server, sends a request through the proxy, and asserts the response is
// relayed and the exchange is observed. This exercises the full P0-01 path.
func TestProxyRelaysAndObserves(t *testing.T) {
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Origin", "yes")
		w.WriteHeader(http.StatusTeapot)
		_, _ = io.WriteString(w, "hello from origin")
	}))
	defer origin.Close()

	var observed []Exchange
	proxyServer := httptest.NewServer(New(ObserverFunc(func(e Exchange) {
		observed = append(observed, e)
	})))
	defer proxyServer.Close()

	// A client that routes every request through our proxy.
	proxyURL, err := url.Parse(proxyServer.URL)
	if err != nil {
		t.Fatalf("parse proxy url: %v", err)
	}
	client := &http.Client{
		Transport: &http.Transport{Proxy: http.ProxyURL(proxyURL)},
	}

	resp, err := client.Get(origin.URL)
	if err != nil {
		t.Fatalf("request through proxy failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusTeapot {
		t.Errorf("status: got %d, want %d", resp.StatusCode, http.StatusTeapot)
	}
	if got := resp.Header.Get("X-Origin"); got != "yes" {
		t.Errorf("origin header not relayed: got %q", got)
	}
	body, _ := io.ReadAll(resp.Body)
	if string(body) != "hello from origin" {
		t.Errorf("body not relayed: got %q", string(body))
	}

	if len(observed) != 1 {
		t.Fatalf("observer saw %d exchanges, want 1", len(observed))
	}
	e := observed[0]
	if e.Method != http.MethodGet {
		t.Errorf("observed method: got %q, want GET", e.Method)
	}
	if e.StatusCode != http.StatusTeapot {
		t.Errorf("observed status: got %d, want %d", e.StatusCode, http.StatusTeapot)
	}
	if e.Err != nil {
		t.Errorf("observed unexpected error: %v", e.Err)
	}
	// A loopback round-trip can be faster than the OS clock resolution (notably
	// on Windows), so an exact 0 is legitimate; only a negative value is a bug.
	if e.Duration < 0 {
		t.Errorf("observed negative duration: %v", e.Duration)
	}
}

// TestConnectRejectedInPhase0 confirms HTTPS tunneling is cleanly refused for
// now (it is implemented in Phase 1), rather than silently mishandled.
func TestConnectRejectedInPhase0(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodConnect, "example.com:443", nil)

	New(nil).ServeHTTP(rec, req)

	if rec.Code != http.StatusNotImplemented {
		t.Errorf("CONNECT status: got %d, want %d", rec.Code, http.StatusNotImplemented)
	}
}
