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
