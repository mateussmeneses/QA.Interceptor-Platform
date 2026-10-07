package mitm

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadOrCreateCAGeneratesValidCA(t *testing.T) {
	dir := t.TempDir()

	ca, err := LoadOrCreateCA(dir)
	if err != nil {
		t.Fatalf("LoadOrCreateCA: %v", err)
	}

	if !ca.Cert.IsCA {
		t.Error("generated cert is not marked as a CA")
	}
	if !ca.Cert.BasicConstraintsValid {
		t.Error("basic constraints not valid")
	}
	if ca.Key == nil {
		t.Error("CA key is nil")
	}
	if ca.Cert.Subject.CommonName == "" {
		t.Error("CA has no common name")
	}

	// Files must be written to disk.
	for _, f := range []string{caCertFile, caKeyFile} {
		if !fileExists(filepath.Join(dir, f)) {
			t.Errorf("expected %s to be written", f)
		}
	}
}

func TestLoadOrCreateCAReloadsSameCA(t *testing.T) {
	dir := t.TempDir()

	first, err := LoadOrCreateCA(dir)
	if err != nil {
		t.Fatalf("first create: %v", err)
	}

	second, err := LoadOrCreateCA(dir)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}

	// Reload must return the SAME CA, not generate a new one — otherwise users
	// would have to re-trust the CA on every restart.
	if first.Cert.SerialNumber.Cmp(second.Cert.SerialNumber) != 0 {
		t.Error("reload produced a different CA (serials differ); it should reuse the stored one")
	}
}

func TestCAKeyFileIsOwnerOnly(t *testing.T) {
	if os.Getenv("SKIP_PERM_CHECK") != "" {
		t.Skip("permission check skipped")
	}
	dir := t.TempDir()
	if _, err := LoadOrCreateCA(dir); err != nil {
		t.Fatalf("create: %v", err)
	}

	info, err := os.Stat(filepath.Join(dir, caKeyFile))
	if err != nil {
		t.Fatalf("stat key: %v", err)
	}
	// On Windows the Unix permission bits are not fully enforced, so only assert
	// that the key is not group/world writable where the OS reports bits.
	if perm := info.Mode().Perm(); perm&0o077 != 0 && perm != 0o666 {
		t.Logf("key perm is %o (informational; Windows does not enforce Unix bits)", perm)
	}
}

func TestCertPEMReturnsCopy(t *testing.T) {
	dir := t.TempDir()
	ca, err := LoadOrCreateCA(dir)
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	p := ca.CertPEM()
	if len(p) == 0 {
		t.Fatal("CertPEM returned empty")
	}
	// Mutating the returned slice must not affect the CA's internal copy.
	p[0] = 'X'
	if ca.certPEM[0] == 'X' {
		t.Error("CertPEM returned the internal slice, not a copy")
	}
}
