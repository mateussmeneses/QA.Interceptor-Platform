// Package mitm provides the TLS man-in-the-middle machinery for HTTPS
// interception: a locally-generated root certificate authority (P1-01) and,
// later, per-host leaf certificate signing (P1-02).
//
// Security: the root CA private key is the trust anchor for everything the
// proxy decrypts. It is generated locally, stored under a user-controlled
// directory, and must NEVER be committed or transmitted (see .gitignore).
package mitm

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"os"
	"path/filepath"
	"time"
)

const (
	caCertFile = "ca-cert.pem"
	caKeyFile  = "ca-key.pem"

	// caValidity is how long the generated root CA is valid. Long enough that a
	// user does not have to re-trust it constantly; short enough to be sane.
	caValidity = 10 * 365 * 24 * time.Hour
)

// CA is a loaded root certificate authority used to sign per-host leaf certs.
type CA struct {
	Cert *x509.Certificate
	Key  *ecdsa.PrivateKey

	// certPEM / keyPEM are the on-disk encodings, kept for export (P1-04).
	certPEM []byte
	keyPEM  []byte
}

// LoadOrCreateCA loads the root CA from dir, or generates and persists a new
// one if either file is missing. The directory is created if needed.
func LoadOrCreateCA(dir string) (*CA, error) {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, fmt.Errorf("create cert dir: %w", err)
	}

	certPath := filepath.Join(dir, caCertFile)
	keyPath := filepath.Join(dir, caKeyFile)

	if fileExists(certPath) && fileExists(keyPath) {
		ca, err := loadCA(certPath, keyPath)
		if err != nil {
			return nil, fmt.Errorf("load existing CA: %w", err)
		}
		return ca, nil
	}

	ca, err := generateCA()
	if err != nil {
		return nil, fmt.Errorf("generate CA: %w", err)
	}
	if err := ca.persist(certPath, keyPath); err != nil {
		return nil, fmt.Errorf("persist CA: %w", err)
	}
	return ca, nil
}

// CertPEM returns the PEM-encoded CA certificate, for export/trust (P1-04).
func (c *CA) CertPEM() []byte {
	out := make([]byte, len(c.certPEM))
	copy(out, c.certPEM)
	return out
}

// ExportCert writes the CA certificate (public, safe to share) to path. The
// private key is never exported.
func (c *CA) ExportCert(path string) error {
	if err := os.WriteFile(path, c.certPEM, 0o644); err != nil {
		return fmt.Errorf("export CA cert: %w", err)
	}
	return nil
}

func generateCA() (*CA, error) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("generate key: %w", err)
	}

	serial, err := randomSerial()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	template := &x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			CommonName:   "QA.Interceptor Local CA",
			Organization: []string{"QA.Interceptor Platform"},
		},
		NotBefore:             now.Add(-1 * time.Hour), // tolerate small clock skew
		NotAfter:              now.Add(caValidity),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageCRLSign | x509.KeyUsageDigitalSignature,
		BasicConstraintsValid: true,
		IsCA:                  true,
		MaxPathLenZero:        true, // this CA only signs leaf certs, not sub-CAs
	}

	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		return nil, fmt.Errorf("create certificate: %w", err)
	}

	cert, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, fmt.Errorf("parse created certificate: %w", err)
	}

	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})

	keyDER, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		return nil, fmt.Errorf("marshal key: %w", err)
	}
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})

	return &CA{Cert: cert, Key: key, certPEM: certPEM, keyPEM: keyPEM}, nil
}

func loadCA(certPath, keyPath string) (*CA, error) {
	certPEM, err := os.ReadFile(certPath)
	if err != nil {
		return nil, err
	}
	keyPEM, err := os.ReadFile(keyPath)
	if err != nil {
		return nil, err
	}

	certBlock, _ := pem.Decode(certPEM)
	if certBlock == nil || certBlock.Type != "CERTIFICATE" {
		return nil, fmt.Errorf("invalid CA certificate PEM")
	}
	cert, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse CA certificate: %w", err)
	}

	keyBlock, _ := pem.Decode(keyPEM)
	if keyBlock == nil || keyBlock.Type != "EC PRIVATE KEY" {
		return nil, fmt.Errorf("invalid CA key PEM")
	}
	key, err := x509.ParseECPrivateKey(keyBlock.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse CA key: %w", err)
	}

	return &CA{Cert: cert, Key: key, certPEM: certPEM, keyPEM: keyPEM}, nil
}

// persist writes the CA cert (world-readable) and key (owner-only) to disk.
func (c *CA) persist(certPath, keyPath string) error {
	if err := os.WriteFile(certPath, c.certPEM, 0o644); err != nil {
		return err
	}
	// The private key is sensitive: owner read/write only.
	if err := os.WriteFile(keyPath, c.keyPEM, 0o600); err != nil {
		return err
	}
	return nil
}

func randomSerial() (*big.Int, error) {
	limit := new(big.Int).Lsh(big.NewInt(1), 128)
	serial, err := rand.Int(rand.Reader, limit)
	if err != nil {
		return nil, fmt.Errorf("generate serial: %w", err)
	}
	return serial, nil
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
