// Command proxy starts the QA.Interceptor local forward proxy.
//
// Phase 0: relays plain HTTP and logs each exchange to stdout. Point an HTTP
// client at it, e.g. set the browser/system HTTP proxy to 127.0.0.1:<port>.
package main

import (
	"context"
	"flag"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/qa-interceptor/platform/internal/capture"
	"github.com/qa-interceptor/platform/internal/proxy"
)

func main() {
	port := flag.Int("port", 8080, "port to listen on (127.0.0.1)")
	flag.Parse()

	addr := "127.0.0.1:" + strconv.Itoa(*port)

	// The proxy fans each exchange out to the stdout logger (live view) and the
	// in-memory capture store (inspectable; surfaced by the UI in Phase 2).
	store := capture.NewStore(0)
	observer := proxy.MultiObserver(proxy.StdoutLogger(), store)

	srv, err := proxy.ListenAndServe(addr, observer)
	if err != nil {
		log.Fatalf("failed to start proxy: %v", err)
	}
	log.Printf("QA.Interceptor proxy listening on http://%s", addr)
	log.Printf("Point your HTTP client at this address. Press Ctrl-C to stop.")

	// Block until an interrupt signal arrives, then shut down gracefully.
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Printf("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
	log.Printf("captured %d request(s) this session.", store.Len())
	log.Printf("stopped.")
}
