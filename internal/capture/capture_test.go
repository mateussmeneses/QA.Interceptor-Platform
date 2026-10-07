package capture

import (
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/qa-interceptor/platform/internal/proxy"
)

func TestStoreRecordsExchange(t *testing.T) {
	s := NewStore(10)
	s.Observe(proxy.Exchange{
		Method:     "GET",
		URL:        "http://example.com/",
		StatusCode: 200,
		Duration:   5 * time.Millisecond,
	})

	records := s.List()
	if len(records) != 1 {
		t.Fatalf("len: got %d, want 1", len(records))
	}
	r := records[0]
	if r.ID != 1 {
		t.Errorf("ID: got %d, want 1", r.ID)
	}
	if r.Method != "GET" || r.URL != "http://example.com/" || r.StatusCode != 200 {
		t.Errorf("fields not stored: %+v", r)
	}
	if r.Err != "" {
		t.Errorf("Err: got %q, want empty", r.Err)
	}
	if r.CapturedAt.IsZero() {
		t.Error("CapturedAt was not set")
	}
}

func TestStoreCapturesError(t *testing.T) {
	s := NewStore(10)
	s.Observe(proxy.Exchange{Method: "GET", URL: "http://x/", Err: errors.New("boom")})

	r := s.List()[0]
	if r.Err != "boom" {
		t.Errorf("Err: got %q, want %q", r.Err, "boom")
	}
}

func TestStoreOrderingNewestLast(t *testing.T) {
	s := NewStore(10)
	for _, m := range []string{"A", "B", "C"} {
		s.Observe(proxy.Exchange{Method: m, URL: "http://x/"})
	}

	records := s.List()
	if len(records) != 3 {
		t.Fatalf("len: got %d, want 3", len(records))
	}
	if records[0].Method != "A" || records[2].Method != "C" {
		t.Errorf("ordering wrong: %q .. %q", records[0].Method, records[2].Method)
	}
	// IDs must be strictly increasing in insertion order.
	if records[0].ID >= records[1].ID || records[1].ID >= records[2].ID {
		t.Errorf("IDs not monotonic: %d %d %d", records[0].ID, records[1].ID, records[2].ID)
	}
}

func TestStoreEnforcesCap(t *testing.T) {
	s := NewStore(3)
	for i := 0; i < 5; i++ {
		s.Observe(proxy.Exchange{Method: "GET", URL: "http://x/"})
	}

	records := s.List()
	if len(records) != 3 {
		t.Fatalf("cap not enforced: got %d, want 3", len(records))
	}
	// The three kept must be the newest (IDs 3,4,5); oldest dropped first.
	if records[0].ID != 3 || records[2].ID != 5 {
		t.Errorf("wrong records retained: first ID %d, last ID %d", records[0].ID, records[2].ID)
	}
}

func TestStoreDefaultCap(t *testing.T) {
	s := NewStore(0) // falls back to DefaultMaxItems
	if s.maxItems != DefaultMaxItems {
		t.Errorf("default cap: got %d, want %d", s.maxItems, DefaultMaxItems)
	}
}

func TestStoreClear(t *testing.T) {
	s := NewStore(10)
	s.Observe(proxy.Exchange{Method: "GET", URL: "http://x/"})
	s.Clear()
	if s.Len() != 0 {
		t.Errorf("after clear Len: got %d, want 0", s.Len())
	}
	// IDs stay monotonic across clears.
	s.Observe(proxy.Exchange{Method: "GET", URL: "http://y/"})
	if s.List()[0].ID != 2 {
		t.Errorf("ID after clear: got %d, want 2", s.List()[0].ID)
	}
}

// TestStoreConcurrentWrites hammers the store from many goroutines. Run with
// `go test -race` to prove the locking is correct.
func TestStoreConcurrentWrites(t *testing.T) {
	s := NewStore(10000)
	const goroutines, perG = 50, 100

	var wg sync.WaitGroup
	wg.Add(goroutines)
	for g := 0; g < goroutines; g++ {
		go func() {
			defer wg.Done()
			for i := 0; i < perG; i++ {
				s.Observe(proxy.Exchange{Method: "GET", URL: "http://x/"})
			}
		}()
	}
	wg.Wait()

	if got := s.Len(); got != goroutines*perG {
		t.Errorf("concurrent writes lost records: got %d, want %d", got, goroutines*perG)
	}
	// All IDs must be unique even under concurrency.
	seen := make(map[int64]bool)
	for _, r := range s.List() {
		if seen[r.ID] {
			t.Fatalf("duplicate ID under concurrency: %d", r.ID)
		}
		seen[r.ID] = true
	}
}
