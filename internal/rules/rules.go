// Package rules defines the traffic-modification rule model and the pure
// matching logic that decides which rules apply to a request.
//
// Phase 3 scope: this package is pure (no net/http server coupling, no I/O in
// the matching path) so it is cheap to unit-test exhaustively. The proxy wires
// the matched actions in; the decision of WHAT matches lives here.
package rules

import "strings"

// ActionType enumerates what a rule does to a matching request/response.
type ActionType string

const (
	// ActionBlock fails the request without contacting the origin (P3-02).
	ActionBlock ActionType = "block"
	// ActionRedirect sends the client to a different URL (P3-03).
	ActionRedirect ActionType = "redirect"
	// ActionRewriteHeader adds/removes request or response headers (P3-04).
	ActionRewriteHeader ActionType = "rewrite-header"
	// ActionMockResponse returns a synthetic response, skipping origin (P3-05).
	ActionMockResponse ActionType = "mock-response"
	// ActionRewriteResponseBody edits the response body in flight (P3-06).
	ActionRewriteResponseBody ActionType = "rewrite-response-body"
)

// Condition decides whether a rule applies to a request. An empty field is a
// wildcard: an empty Method matches any method; an empty URLContains matches
// any URL. A condition with both empty matches every request.
type Condition struct {
	// Method, if set, must equal the request method (case-insensitive).
	Method string `json:"method,omitempty"`
	// URLContains, if set, must be a substring of the request URL
	// (case-sensitive — URLs are case-sensitive except for scheme/host, and a
	// substring filter is most predictable when literal).
	URLContains string `json:"urlContains,omitempty"`
}

// HeaderOp is a single header mutation for ActionRewriteHeader.
type HeaderOp struct {
	Name   string `json:"name"`
	Value  string `json:"value,omitempty"` // used when Op == "set"
	Remove bool   `json:"remove,omitempty"`
	OnResp bool   `json:"onResponse,omitempty"` // false = request header, true = response
}

// Rule is one modification rule. Only the fields relevant to its Action are
// used; the rest are ignored.
type Rule struct {
	Name      string     `json:"name"`
	Enabled   bool       `json:"enabled"`
	Condition Condition  `json:"condition"`
	Action    ActionType `json:"action"`

	// RedirectTo is the target URL for ActionRedirect.
	RedirectTo string `json:"redirectTo,omitempty"`
	// Headers are the mutations for ActionRewriteHeader.
	Headers []HeaderOp `json:"headers,omitempty"`
	// MockStatus / MockBody define the synthetic response for ActionMockResponse.
	MockStatus int    `json:"mockStatus,omitempty"`
	MockBody   string `json:"mockBody,omitempty"`
	// BodySearch / BodyReplace define a literal substring replacement for
	// ActionRewriteResponseBody (all occurrences).
	BodySearch  string `json:"bodySearch,omitempty"`
	BodyReplace string `json:"bodyReplace,omitempty"`
}

// Request is the minimal view of a request the matcher needs. The proxy adapts
// its real request into this so the package stays free of net/http coupling.
type Request struct {
	Method string
	URL    string
}

// Matches reports whether this rule's condition applies to req. A disabled rule
// never matches.
func (r Rule) Matches(req Request) bool {
	if !r.Enabled {
		return false
	}
	if r.Condition.Method != "" && !strings.EqualFold(r.Condition.Method, req.Method) {
		return false
	}
	if r.Condition.URLContains != "" && !strings.Contains(req.URL, r.Condition.URLContains) {
		return false
	}
	return true
}

// Set is an ordered collection of rules. Order matters: the first matching rule
// of a given action kind wins (callers decide how to combine).
type Set struct {
	rules []Rule
}

// NewSet builds a rule set from rules in priority order (earlier = higher).
func NewSet(rules []Rule) *Set {
	return &Set{rules: rules}
}

// Match returns every enabled rule whose condition applies to req, in the set's
// order. Returns an empty slice when nothing matches (never nil-dependent).
func (s *Set) Match(req Request) []Rule {
	var out []Rule
	for _, rule := range s.rules {
		if rule.Matches(req) {
			out = append(out, rule)
		}
	}
	return out
}

// FirstMatch returns the first rule (in order) that both matches req and has one
// of the wanted action types, and true; or a zero Rule and false. This is how
// the proxy picks the single short-circuiting action (block/redirect/mock) to
// apply before relaying.
func (s *Set) FirstMatch(req Request, wanted ...ActionType) (Rule, bool) {
	wantSet := make(map[ActionType]bool, len(wanted))
	for _, a := range wanted {
		wantSet[a] = true
	}
	for _, rule := range s.rules {
		if rule.Matches(req) && wantSet[rule.Action] {
			return rule, true
		}
	}
	return Rule{}, false
}
