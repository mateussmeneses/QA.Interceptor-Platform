// Command proxy starts the QA.Interceptor local intercepting proxy.
//
// It relays plain HTTP and, with the generated local CA trusted by the client,
// intercepts HTTPS via TLS MITM. Each exchange is logged and captured. Point an
// HTTP client at it, e.g. set the browser/system proxy to 127.0.0.1:<port>.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/qa-interceptor/platform/internal/capture"
	"github.com/qa-interceptor/platform/internal/mitm"
	"github.com/qa-interceptor/platform/internal/proxy"
	"github.com/qa-interceptor/platform/internal/rules"
	"github.com/qa-interceptor/platform/internal/ui"
)

func main() {
	port := flag.Int("port", 8080, "proxy port (127.0.0.1)")
	uiPort := flag.Int("ui-port", 9090, "web UI port (127.0.0.1)")
	certDir := flag.String("cert-dir", ".certs", "directory for the local MITM root CA")
	exportCA := flag.String("export-ca", "", "write the CA certificate to this path and exit")
	noMITMHosts := flag.String("no-mitm-hosts", "", "comma-separated hosts to tunnel without decryption")
	rulesFile := flag.String("rules", "", "path to a JSON file of modification rules")
	flag.Parse()

	addr := "127.0.0.1:" + strconv.Itoa(*port)
	uiAddr := "127.0.0.1:" + strconv.Itoa(*uiPort)

	// Load or create the local root CA, and build a per-host leaf cache for MITM.
	ca, err := mitm.LoadOrCreateCA(*certDir)
	if err != nil {
		log.Fatalf("failed to prepare local CA: %v", err)
	}

	// --export-ca is a one-shot action: write the public CA cert and exit.
	if *exportCA != "" {
		if err := ca.ExportCert(*exportCA); err != nil {
			log.Fatalf("export failed: %v", err)
		}
		log.Printf("CA certificate written to %s. Trust it in your OS/browser to intercept HTTPS.", *exportCA)
		return
	}

	leaves := mitm.NewLeafCache(ca)

	// Load modification rules, if a file was given.
	ruleSet, ruleCount, err := loadRules(*rulesFile)
	if err != nil {
		log.Fatalf("failed to load rules: %v", err)
	}

	// The proxy fans each exchange out to the stdout logger (live view) and the
	// in-memory capture store (inspectable; surfaced by the UI in Phase 2).
	store := capture.NewStore(0)
	observer := proxy.MultiObserver(proxy.StdoutLogger(), store)
	handler := proxy.New(observer).
		WithMITM(leaves).
		WithTunnelDecider(mitmDecider(*noMITMHosts)).
		WithRules(ruleSet)

	srv, err := proxy.ListenAndServe(addr, handler)
	if err != nil {
		log.Fatalf("failed to start proxy: %v", err)
	}

	// The inspection UI reads the capture store live (P2-01).
	uiSrv, err := ui.ListenAndServe(uiAddr, store)
	if err != nil {
		log.Fatalf("failed to start UI: %v", err)
	}

	log.Printf("QA.Interceptor proxy listening on http://%s", addr)
	log.Printf("Inspection UI at http://%s", uiAddr)
	log.Printf("Local CA at %s/ca-cert.pem — trust it to intercept HTTPS.", *certDir)
	if *noMITMHosts != "" {
		log.Printf("Tunneling without decryption for: %s", *noMITMHosts)
	}
	if ruleCount > 0 {
		log.Printf("Loaded %d modification rule(s) from %s", ruleCount, *rulesFile)
	}
	log.Printf("Point your HTTP client at the proxy address. Press Ctrl-C to stop.")

	// Block until an interrupt signal arrives, then shut down gracefully.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Printf("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("graceful proxy shutdown failed: %v", err)
	}
	if err := uiSrv.Shutdown(ctx); err != nil {
		log.Printf("graceful UI shutdown failed: %v", err)
	}
	log.Printf("captured %d request(s) this session.", store.Len())
	log.Printf("stopped.")
}

// loadRules reads a JSON array of rules from path. An empty path returns a nil
// engine (no rules). Returns the engine, how many rules were loaded, and any
// error. The nil interface is important: a typed-nil *rules.Set would panic.
func loadRules(path string) (proxy.RuleEngine, int, error) {
	if strings.TrimSpace(path) == "" {
		return nil, 0, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, 0, fmt.Errorf("read rules file: %w", err)
	}

	var loaded []rules.Rule
	if err := json.Unmarshal(data, &loaded); err != nil {
		return nil, 0, fmt.Errorf("parse rules JSON: %w", err)
	}

	return rules.NewSet(loaded), len(loaded), nil
}

// mitmDecider builds the "should this host be decrypted?" predicate from a
// comma-separated no-MITM host list. Hosts on the list are tunneled raw; all
// others are intercepted. An empty list means "intercept everything".
func mitmDecider(noMITMHosts string) func(string) bool {
	if strings.TrimSpace(noMITMHosts) == "" {
		return nil // nil decider => MITM every host
	}

	skip := make(map[string]bool)
	for _, h := range strings.Split(noMITMHosts, ",") {
		if h = strings.TrimSpace(h); h != "" {
			skip[strings.ToLower(h)] = true
		}
	}

	return func(host string) bool {
		return !skip[strings.ToLower(host)]
	}
}
