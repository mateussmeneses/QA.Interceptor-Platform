package rules

import "testing"

func req(method, url string) Request { return Request{Method: method, URL: url} }

func TestMatchesMethodAndURL(t *testing.T) {
	r := Rule{
		Enabled:   true,
		Condition: Condition{Method: "GET", URLContains: "/api/users"},
		Action:    ActionBlock,
	}

	cases := []struct {
		name string
		req  Request
		want bool
	}{
		{"both match", req("GET", "https://x/api/users?page=1"), true},
		{"method case-insensitive", req("get", "https://x/api/users"), true},
		{"wrong method", req("POST", "https://x/api/users"), false},
		{"url missing substring", req("GET", "https://x/api/orders"), false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := r.Matches(c.req); got != c.want {
				t.Errorf("Matches = %v, want %v", got, c.want)
			}
		})
	}
}

func TestEmptyConditionIsWildcard(t *testing.T) {
	r := Rule{Enabled: true, Action: ActionBlock} // no method, no urlContains

	if !r.Matches(req("GET", "http://anything/")) {
		t.Error("empty condition should match any request")
	}
	if !r.Matches(req("DELETE", "https://other/path")) {
		t.Error("empty condition should match regardless of method")
	}
}

func TestMethodOnlyAndURLOnly(t *testing.T) {
	methodOnly := Rule{Enabled: true, Condition: Condition{Method: "POST"}, Action: ActionBlock}
	if !methodOnly.Matches(req("POST", "http://a/")) {
		t.Error("method-only rule should match any URL with that method")
	}
	if methodOnly.Matches(req("GET", "http://a/")) {
		t.Error("method-only rule should not match other methods")
	}

	urlOnly := Rule{Enabled: true, Condition: Condition{URLContains: "secret"}, Action: ActionBlock}
	if !urlOnly.Matches(req("GET", "http://a/secret/data")) {
		t.Error("url-only rule should match any method with that substring")
	}
	if urlOnly.Matches(req("GET", "http://a/public")) {
		t.Error("url-only rule should not match without the substring")
	}
}

func TestDisabledRuleNeverMatches(t *testing.T) {
	r := Rule{Enabled: false, Action: ActionBlock} // wildcard but disabled
	if r.Matches(req("GET", "http://a/")) {
		t.Error("disabled rule must never match")
	}
}

func TestSetMatchReturnsAllInOrder(t *testing.T) {
	set := NewSet([]Rule{
		{Name: "a", Enabled: true, Condition: Condition{URLContains: "x"}, Action: ActionBlock},
		{Name: "b", Enabled: true, Action: ActionRewriteHeader}, // wildcard
		{Name: "c", Enabled: false, Action: ActionRedirect},     // disabled
		{Name: "d", Enabled: true, Condition: Condition{URLContains: "nope"}, Action: ActionBlock},
	})

	got := set.Match(req("GET", "http://host/x"))
	if len(got) != 2 {
		t.Fatalf("match count: got %d, want 2", len(got))
	}
	if got[0].Name != "a" || got[1].Name != "b" {
		t.Errorf("order/selection wrong: got %q, %q", got[0].Name, got[1].Name)
	}
}

func TestSetMatchEmptyWhenNothingMatches(t *testing.T) {
	set := NewSet([]Rule{
		{Name: "a", Enabled: true, Condition: Condition{URLContains: "zzz"}, Action: ActionBlock},
	})
	if got := set.Match(req("GET", "http://host/x")); len(got) != 0 {
		t.Errorf("expected no matches, got %d", len(got))
	}
}

func TestFirstMatchByAction(t *testing.T) {
	set := NewSet([]Rule{
		{Name: "hdr", Enabled: true, Action: ActionRewriteHeader}, // wildcard, not wanted
		{Name: "redir", Enabled: true, Condition: Condition{URLContains: "go"}, Action: ActionRedirect},
		{Name: "block", Enabled: true, Action: ActionBlock}, // wildcard, wanted
	})

	// Want a short-circuiting action: block or redirect or mock.
	got, ok := set.FirstMatch(req("GET", "http://host/go"), ActionBlock, ActionRedirect, ActionMockResponse)
	if !ok {
		t.Fatal("expected a match")
	}
	// "redir" comes before "block" in order and is a wanted action.
	if got.Name != "redir" {
		t.Errorf("first match: got %q, want %q", got.Name, "redir")
	}
}

func TestFirstMatchNoneWanted(t *testing.T) {
	set := NewSet([]Rule{
		{Name: "hdr", Enabled: true, Action: ActionRewriteHeader},
	})
	if _, ok := set.FirstMatch(req("GET", "http://a/"), ActionBlock); ok {
		t.Error("expected no short-circuit match")
	}
}
