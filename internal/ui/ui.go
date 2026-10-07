// Package ui serves a local web interface for inspecting captured traffic.
//
// Phase 2 scope (P2-01): a tiny localhost server with a static page that polls
// a JSON endpoint and lists captured requests live. It reads from the capture
// store through the RecordSource interface so it stays decoupled from the proxy.
package ui

import (
	"embed"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/qa-interceptor/platform/internal/capture"
)

//go:embed static/*
var staticFiles embed.FS

// RecordSource is the read side of the capture store the UI needs. The concrete
// *capture.Store satisfies it.
type RecordSource interface {
	List() []capture.Record
	Get(id int64) (capture.Record, bool)
}

// requestDTO is the summary JSON shape for the list. It is a view model, kept
// separate from capture.Record so the wire format is explicit and stable.
type requestDTO struct {
	ID         int64  `json:"id"`
	Method     string `json:"method"`
	URL        string `json:"url"`
	StatusCode int    `json:"status"`
	DurationMs int64  `json:"durationMs"`
	Err        string `json:"error,omitempty"`
	CapturedAt string `json:"capturedAt"`
}

// detailDTO is the full JSON shape for one request's detail view. Bodies are
// surfaced as UTF-8 text (captured traffic may be binary; the browser shows it
// best-effort).
type detailDTO struct {
	requestDTO
	ReqHeaders        map[string][]string `json:"reqHeaders"`
	ReqBody           string              `json:"reqBody"`
	ReqBodyTruncated  bool                `json:"reqBodyTruncated"`
	RespHeaders       map[string][]string `json:"respHeaders"`
	RespBody          string              `json:"respBody"`
	RespBodyTruncated bool                `json:"respBodyTruncated"`
}

// Server is the UI HTTP server. Construct it with New.
type Server struct {
	source RecordSource
	mux    *http.ServeMux
}

// New builds a UI server backed by the given record source.
func New(source RecordSource) *Server {
	s := &Server{source: source, mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.mux.HandleFunc("/api/requests", s.handleRequests)
	s.mux.HandleFunc("/api/requests/{id}", s.handleRequestDetail)
	s.mux.Handle("/", http.FileServer(http.FS(staticFiles)))
	// The embedded files live under static/, so "/" would 404 the index.
	// Serve index.html explicitly at the root.
	s.mux.HandleFunc("/index.html", s.handleIndex)
	s.mux.HandleFunc("/{$}", s.handleIndex)
}

func (s *Server) handleIndex(w http.ResponseWriter, _ *http.Request) {
	data, err := staticFiles.ReadFile("static/index.html")
	if err != nil {
		http.Error(w, "index not found", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(data)
}

func (s *Server) handleRequests(w http.ResponseWriter, _ *http.Request) {
	records := s.source.List()

	// Newest first is more useful in a live list.
	dtos := make([]requestDTO, 0, len(records))
	for i := len(records) - 1; i >= 0; i-- {
		dtos = append(dtos, toDTO(records[i]))
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(dtos); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (s *Server) handleRequestDetail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	rec, ok := s.source.Get(id)
	if !ok {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	detail := detailDTO{
		requestDTO:        toDTO(rec),
		ReqHeaders:        rec.ReqHeaders,
		ReqBody:           string(rec.ReqBody),
		ReqBodyTruncated:  rec.ReqBodyTruncated,
		RespHeaders:       rec.RespHeaders,
		RespBody:          string(rec.RespBody),
		RespBodyTruncated: rec.RespBodyTruncated,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(detail); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func toDTO(r capture.Record) requestDTO {
	return requestDTO{
		ID:         r.ID,
		Method:     r.Method,
		URL:        r.URL,
		StatusCode: r.StatusCode,
		DurationMs: r.Duration.Milliseconds(),
		Err:        r.Err,
		CapturedAt: r.CapturedAt.Format(time.RFC3339),
	}
}

// ListenAndServe starts the UI server on addr and returns the running server
// for graceful shutdown.
func ListenAndServe(addr string, source RecordSource) (*http.Server, error) {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("ui listen on %s: %w", addr, err)
	}
	srv := &http.Server{Handler: New(source).mux}
	go func() {
		_ = srv.Serve(ln)
	}()
	return srv, nil
}
