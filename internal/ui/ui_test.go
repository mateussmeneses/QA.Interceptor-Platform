package ui

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/qa-interceptor/platform/internal/capture"
)

// stubSource is a fixed RecordSource for deterministic tests.
type stubSource struct{ records []capture.Record }

func (s *stubSource) List() []capture.Record { return s.records }

func (s *stubSource) Get(id int64) (capture.Record, bool) {
	for _, r := range s.records {
		if r.ID == id {
			return r, true
		}
	}
	return capture.Record{}, false
}

func (s *stubSource) Clear() { s.records = nil }

func TestAPIRequestsReturnsRecordsNewestFirst(t *testing.T) {
	src := &stubSource{records: []capture.Record{
		{ID: 1, Method: "GET", URL: "http://a/", StatusCode: 200, Duration: 10 * time.Millisecond, CapturedAt: time.Now()},
		{ID: 2, Method: "POST", URL: "http://b/", StatusCode: 500, Duration: 20 * time.Millisecond, CapturedAt: time.Now()},
	}}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/requests", nil)
	New(src).mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("content-type: got %q", ct)
	}

	var got []requestDTO
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len: got %d, want 2", len(got))
	}
	// Newest first: ID 2 should lead.
	if got[0].ID != 2 || got[1].ID != 1 {
		t.Errorf("order: got [%d, %d], want [2, 1]", got[0].ID, got[1].ID)
	}
	if got[0].DurationMs != 20 {
		t.Errorf("durationMs: got %d, want 20", got[0].DurationMs)
	}
}

func TestAPIRequestsEmpty(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/requests", nil)
	New(&stubSource{}).mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200", rec.Code)
	}
	// Must be an empty JSON array, not null.
	if body := strings.TrimSpace(rec.Body.String()); body != "[]" {
		t.Errorf("empty body: got %q, want []", body)
	}
}

func TestAPIRequestDetail(t *testing.T) {
	src := &stubSource{records: []capture.Record{
		{
			ID: 7, Method: "POST", URL: "http://a/", StatusCode: 201,
			ReqHeaders:  http.Header{"Content-Type": {"application/json"}},
			ReqBody:     []byte(`{"hello":"world"}`),
			RespHeaders: http.Header{"X-Server": {"test"}},
			RespBody:    []byte("created"), CapturedAt: time.Now(),
		},
	}}

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/requests/7", nil)
	New(src).mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200", rec.Code)
	}
	body := rec.Body.String()
	for _, want := range []string{`"id":7`, `hello`, `created`, `application/json`, `X-Server`} {
		if !strings.Contains(body, want) {
			t.Errorf("detail body missing %q; got: %s", want, body)
		}
	}
}

func TestAPIRequestDetailNotFound(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/requests/999", nil)
	New(&stubSource{}).mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("status: got %d, want 404", rec.Code)
	}
}

func TestClearEmptiesStore(t *testing.T) {
	src := &stubSource{records: []capture.Record{
		{ID: 1, Method: "GET", URL: "http://a/", CapturedAt: time.Now()},
	}}
	srv := New(src)

	rec := httptest.NewRecorder()
	srv.mux.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/clear", nil))

	if rec.Code != http.StatusNoContent {
		t.Fatalf("clear status: got %d, want 204", rec.Code)
	}
	if len(src.List()) != 0 {
		t.Errorf("store not cleared: still has %d records", len(src.List()))
	}
}

func TestClearRejectsGet(t *testing.T) {
	rec := httptest.NewRecorder()
	New(&stubSource{}).mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/clear", nil))

	// Only POST is registered for /api/clear, so GET must not succeed.
	if rec.Code == http.StatusNoContent {
		t.Error("GET /api/clear should not clear the store")
	}
}

func TestIndexServesHTML(t *testing.T) {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	New(&stubSource{}).mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "QA.Interceptor") {
		t.Error("index page does not contain expected title")
	}
}
