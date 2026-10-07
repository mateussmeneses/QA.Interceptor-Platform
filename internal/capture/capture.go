// Package capture holds proxied traffic in memory so it can be inspected.
//
// Phase 0 scope (P0-02): a thread-safe, bounded store that implements
// proxy.Observer. It is a *second* observer alongside the stdout logger — the
// proxy does not know about it. Later phases surface this store through a UI
// (Phase 2) and feed it into rules/replay.
package capture

import (
	"net/http"
	"sync"
	"time"

	"github.com/qa-interceptor/platform/internal/proxy"
)

// Record is one captured exchange, enriched with an ID and capture time.
type Record struct {
	ID         int64
	Method     string
	URL        string
	StatusCode int
	Duration   time.Duration
	Err        string // empty when the exchange succeeded
	CapturedAt time.Time

	ReqHeaders  http.Header
	ReqBody     []byte
	RespHeaders http.Header
	RespBody    []byte

	ReqBodyTruncated  bool
	RespBodyTruncated bool
}

// Store keeps the most recent captured exchanges in memory, newest last.
// It is safe for concurrent use: the proxy serves requests on many goroutines.
type Store struct {
	mu       sync.Mutex
	records  []Record
	nextID   int64
	maxItems int
	now      func() time.Time // injectable clock for deterministic tests
}

// DefaultMaxItems bounds memory use when no explicit limit is given.
const DefaultMaxItems = 1000

// NewStore creates a Store holding at most maxItems records (oldest dropped
// first). A maxItems <= 0 falls back to DefaultMaxItems.
func NewStore(maxItems int) *Store {
	if maxItems <= 0 {
		maxItems = DefaultMaxItems
	}
	return &Store{
		maxItems: maxItems,
		now:      time.Now,
	}
}

// Observe records an exchange. It implements proxy.Observer.
func (s *Store) Observe(e proxy.Exchange) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.nextID++
	errText := ""
	if e.Err != nil {
		errText = e.Err.Error()
	}

	s.records = append(s.records, Record{
		ID:                s.nextID,
		Method:            e.Method,
		URL:               e.URL,
		StatusCode:        e.StatusCode,
		Duration:          e.Duration,
		Err:               errText,
		CapturedAt:        s.now(),
		ReqHeaders:        e.ReqHeaders,
		ReqBody:           e.ReqBody,
		RespHeaders:       e.RespHeaders,
		RespBody:          e.RespBody,
		ReqBodyTruncated:  e.ReqBodyTruncated,
		RespBodyTruncated: e.RespBodyTruncated,
	})

	// Enforce the cap by dropping the oldest records.
	if overflow := len(s.records) - s.maxItems; overflow > 0 {
		s.records = append(s.records[:0], s.records[overflow:]...)
	}
}

// List returns a copy of the captured records, oldest first. The copy means
// callers can read freely while the proxy keeps capturing.
func (s *Store) List() []Record {
	s.mu.Lock()
	defer s.mu.Unlock()

	out := make([]Record, len(s.records))
	copy(out, s.records)
	return out
}

// Get returns the record with the given ID and true, or a zero record and
// false if no such record is currently held.
func (s *Store) Get(id int64) (Record, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, r := range s.records {
		if r.ID == id {
			return r, true
		}
	}
	return Record{}, false
}

// Len returns how many records are currently held.
func (s *Store) Len() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.records)
}

// Clear removes all captured records. The ID counter is not reset, so IDs stay
// monotonic across clears.
func (s *Store) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.records = nil
}
