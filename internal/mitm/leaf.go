package mitm

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"fmt"
	"net"
	"sync"
	"time"
)

// leafValidity is how long a per-host leaf certificate is valid. Short-lived:
// leaves are cheap to regenerate and never leave the machine.
const leafValidity = 7 * 24 * time.Hour

// LeafCache signs and caches per-host TLS certificates on demand, each signed
// by the root CA. It is safe for concurrent use.
type LeafCache struct {
	ca    *CA
	mu    sync.Mutex
	certs map[string]*tls.Certificate
}

// NewLeafCache creates a cache that signs leaves with the given CA.
func NewLeafCache(ca *CA) *LeafCache {
	return &LeafCache{ca: ca, certs: make(map[string]*tls.Certificate)}
}

// CertForHost returns a TLS certificate valid for host, signing (and caching)
// a new one if needed. host is a bare hostname (no port).
func (lc *LeafCache) CertForHost(host string) (*tls.Certificate, error) {
	lc.mu.Lock()
	defer lc.mu.Unlock()

	if cert, ok := lc.certs[host]; ok {
		return cert, nil
	}

	cert, err := lc.signLeaf(host)
	if err != nil {
		return nil, err
	}
	lc.certs[host] = cert
	return cert, nil
}

func (lc *LeafCache) signLeaf(host string) (*tls.Certificate, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("generate leaf key: %w", err)
	}

	serial, err := randomSerial()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	template := &x509.Certificate{
		SerialNumber: serial,
		Subject:      pkix.Name{CommonName: host},
		NotBefore:    now.Add(-1 * time.Hour),
		NotAfter:     now.Add(leafValidity),
		KeyUsage:     x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	}

	// A certificate must carry its hostname in the SAN; CommonName alone is
	// ignored by modern clients.
	if ip := net.ParseIP(host); ip != nil {
		template.IPAddresses = []net.IP{ip}
	} else {
		template.DNSNames = []string{host}
	}

	der, err := x509.CreateCertificate(rand.Reader, template, lc.ca.Cert, &key.PublicKey, lc.ca.Key)
	if err != nil {
		return nil, fmt.Errorf("sign leaf for %s: %w", host, err)
	}

	return &tls.Certificate{
		Certificate: [][]byte{der, lc.ca.Cert.Raw},
		PrivateKey:  key,
		Leaf:        template,
	}, nil
}

// TLSConfigForHost returns a *tls.Config that signs leaves on demand. It prefers
// the SNI server name the client sends; when SNI is absent (common for IP-literal
// targets), it falls back to fallbackHost — the host from the CONNECT request.
func (lc *LeafCache) TLSConfigForHost(fallbackHost string) *tls.Config {
	return &tls.Config{
		GetCertificate: func(hello *tls.ClientHelloInfo) (*tls.Certificate, error) {
			host := hello.ServerName
			if host == "" {
				host = fallbackHost
			}
			if host == "" {
				return nil, fmt.Errorf("no SNI and no fallback host; cannot select certificate")
			}
			return lc.CertForHost(host)
		},
		MinVersion: tls.VersionTLS12,
	}
}
