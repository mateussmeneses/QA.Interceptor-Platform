package proxy

import (
	"crypto/tls"
	"crypto/x509"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/qa-interceptor/platform/internal/mitm"
	"github.com/qa-interceptor/platform/internal/rules"
)

// TestMITMInterceptsHTTPS is the P1-02 acceptance test: an HTTPS request routed
// through the proxy is decrypted, relayed to the origin, returned to the
// client, and observed — all using the locally generated CA as the trust root.
func TestMITMInterceptsHTTPS(t *testing.T) {
	// A real HTTPS origin server (its own self-signed cert).
	origin := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Secure", "yes")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, "secret payload")
	}))
	defer origin.Close()

	// Build the MITM proxy with a freshly generated CA + leaf cache.
	ca, err := mitm.LoadOrCreateCA(t.TempDir())
	if err != nil {
		t.Fatalf("CA: %v", err)
	}
	leaves := mitm.NewLeafCache(ca)

	var observed []Exchange
	p := New(ObserverFunc(func(e Exchange) { observed = append(observed, e) })).WithMITM(leaves)

	// The proxy must trust the origin's self-signed cert to relay to it, so give
	// its transport the origin's cert pool. (In production the origin is a real
	// CA-signed server; this is only to run a local TLS origin in the test.)
	p.transport = &http.Transport{
		TLSClientConfig: &tls.Config{RootCAs: certPool(origin)},
	}

	proxyServer := httptest.NewServer(p)
	defer proxyServer.Close()

	// Client trusts OUR CA (as a user would after installing it) and routes
	// through the proxy.
	caPool := x509.NewCertPool()
	caPool.AddCert(ca.Cert)
	proxyURL, _ := url.Parse(proxyServer.URL)
	client := &http.Client{
		Transport: &http.Transport{
			Proxy:           http.ProxyURL(proxyURL),
			TLSClientConfig: &tls.Config{RootCAs: caPool},
		},
	}

	resp, err := client.Get(origin.URL) // origin.URL is https://127.0.0.1:port
	if err != nil {
		t.Fatalf("HTTPS request through MITM proxy failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status: got %d, want 200", resp.StatusCode)
	}
	if got := resp.Header.Get("X-Secure"); got != "yes" {
		t.Errorf("header not relayed: got %q", got)
	}
	body, _ := io.ReadAll(resp.Body)
	if string(body) != "secret payload" {
		t.Errorf("body not relayed: got %q", string(body))
	}

	if len(observed) != 1 {
		t.Fatalf("observer saw %d exchanges, want 1", len(observed))
	}
	if observed[0].StatusCode != http.StatusOK {
		t.Errorf("observed status: got %d, want 200", observed[0].StatusCode)
	}
	// The decrypted exchange must log an https:// URL, proving MITM (not tunnel).
	if u, _ := url.Parse(observed[0].URL); u == nil || u.Scheme != "https" {
		t.Errorf("observed URL not https: %q", observed[0].URL)
	}
}

func certPool(ts *httptest.Server) *x509.CertPool {
	pool := x509.NewCertPool()
	pool.AddCert(ts.Certificate())
	return pool
}

// TestBlockRuleShortCircuits is the P3-02 acceptance test: a request matching a
// block rule returns the block status and the origin is NEVER contacted.
func TestBlockRuleShortCircuits(t *testing.T) {
	originHit := false
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		originHit = true
		_, _ = io.WriteString(w, "should not be reached")
	}))
	defer origin.Close()

	set := rules.NewSet([]rules.Rule{
		{Name: "block-origin", Enabled: true, Action: rules.ActionBlock,
			Condition: rules.Condition{URLContains: "/blocked"}},
	})

	var observed []Exchange
	p := New(ObserverFunc(func(e Exchange) { observed = append(observed, e) })).WithRules(set)
	proxyServer := httptest.NewServer(p)
	defer proxyServer.Close()

	proxyURL, _ := url.Parse(proxyServer.URL)
	client := &http.Client{Transport: &http.Transport{Proxy: http.ProxyURL(proxyURL)}}

	// A matching request is blocked.
	resp, err := client.Get(origin.URL + "/blocked/path")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("blocked status: got %d, want 403", resp.StatusCode)
	}
	if originHit {
		t.Error("origin was contacted for a blocked request; it must be short-circuited")
	}
	if len(observed) != 1 || observed[0].StatusCode != http.StatusForbidden {
		t.Errorf("block exchange not recorded correctly: %+v", observed)
	}

	// A non-matching request still reaches the origin.
	originHit = false
	resp2, err := client.Get(origin.URL + "/allowed")
	if err != nil {
		t.Fatalf("second request failed: %v", err)
	}
	resp2.Body.Close()
	if !originHit {
		t.Error("non-matching request should have reached the origin")
	}
}

// TestTunnelDeciderPassesThrough is the P1-03 acceptance test: a host the
// decider rejects is tunneled raw (loads successfully, NOT captured), while a
// host it accepts is MITM'd (captured). The client trusts only the ORIGIN's own
// cert — not our CA — so a successful load proves there was no decryption.
func TestTunnelDeciderPassesThrough(t *testing.T) {
	origin := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "pass-through ok")
	}))
	defer origin.Close()

	ca, err := mitm.LoadOrCreateCA(t.TempDir())
	if err != nil {
		t.Fatalf("CA: %v", err)
	}
	leaves := mitm.NewLeafCache(ca)

	var observed []Exchange
	// Decider rejects every host -> everything is tunneled raw, nothing captured.
	p := New(ObserverFunc(func(e Exchange) { observed = append(observed, e) })).
		WithMITM(leaves).
		WithTunnelDecider(func(string) bool { return false })

	proxyServer := httptest.NewServer(p)
	defer proxyServer.Close()

	// The client trusts the ORIGIN's self-signed cert directly. If the proxy
	// decrypted (MITM), the client would see our leaf instead and fail. Success
	// therefore proves the bytes passed through untouched.
	proxyURL, _ := url.Parse(proxyServer.URL)
	client := &http.Client{
		Transport: &http.Transport{
			Proxy:           http.ProxyURL(proxyURL),
			TLSClientConfig: &tls.Config{RootCAs: certPool(origin)},
		},
	}

	resp, err := client.Get(origin.URL)
	if err != nil {
		t.Fatalf("pass-through request failed: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if string(body) != "pass-through ok" {
		t.Errorf("body: got %q, want %q", string(body), "pass-through ok")
	}
	if len(observed) != 0 {
		t.Errorf("raw tunnel must not capture, but observed %d exchange(s)", len(observed))
	}
}
