import { evaluateRules, type MatchedRule } from "../../../packages/rule-engine/src/index";
import type { InterceptedRequest, Rule } from "../../../packages/shared-types/src/index";

const CAPTURED_REQUESTS_KEY = "capturedRequests";
const RULES_KEY = "rules";
const MAX_CAPTURED_REQUESTS = 100;

type CapturedRequest = InterceptedRequest & {
  startedAtMs: number;
  matchedRules: MatchedRule[];
  response?: CapturedResponse;
};

type CapturedResponse = {
  status: number;
  durationMs: number;
  timestamp: string;
};

const DEFAULT_RULES: Rule[] = [
  {
    id: "rule-api-get",
    name: "Match API GET requests",
    type: "rewrite-url",
    enabled: true,
    priority: 1,
    createdAt: "2026-06-09T00:00:00.000Z",
    condition: {
      urlContains: "/api",
      method: "GET"
    },
    payload: {
      note: "Core rule engine smoke test"
    }
  },
  {
    id: "rule-graphql-post",
    name: "Match GraphQL POST requests",
    type: "mock-response",
    enabled: true,
    priority: 2,
    createdAt: "2026-06-09T00:01:00.000Z",
    condition: {
      urlContains: "/graphql",
      method: "POST"
    },
    payload: {
      note: "Second deterministic rule"
    }
  },
  {
    id: "rule-admin-disabled",
    name: "Disabled admin request matcher",
    type: "redirect",
    enabled: false,
    priority: 3,
    createdAt: "2026-06-09T00:02:00.000Z",
    condition: {
      urlContains: "/admin"
    },
    payload: {
      note: "Disabled rule kept for enabled-state coverage"
    }
  }
];

chrome.runtime.onInstalled.addListener(() => {
  console.log("QA.Interceptor installed");
  void seedDefaultRules();
});

chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (!isCapturableRequest(details)) {
      return;
    }

    const request = {
      id: details.requestId,
      method: details.method as InterceptedRequest["method"],
      url: details.url,
      headers: {},
      timestamp: new Date().toISOString(),
      startedAtMs: details.timeStamp,
      matchedRules: []
    };

    const rules = await loadRules();
    const evaluation = evaluateRules(rules, request);

    const stored = await chrome.storage.local.get(CAPTURED_REQUESTS_KEY);
    const existing = readCapturedRequests(stored[CAPTURED_REQUESTS_KEY]);

    await chrome.storage.local.set({
      [CAPTURED_REQUESTS_KEY]: [
        {
          ...request,
          matchedRules: evaluation.matchedRules
        },
        ...existing
      ].slice(0, MAX_CAPTURED_REQUESTS)
    });
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (!isCapturableRequest(details)) {
      return;
    }

    const stored = await chrome.storage.local.get(CAPTURED_REQUESTS_KEY);
    const existing = readCapturedRequests(stored[CAPTURED_REQUESTS_KEY]);
    const updated = existing.map((request) =>
      request.id === details.requestId
        ? {
            ...request,
            response: {
              status: details.statusCode,
              durationMs: Math.max(0, Math.round(details.timeStamp - request.startedAtMs)),
              timestamp: new Date(details.timeStamp).toISOString()
            }
          }
        : request
    );

    await chrome.storage.local.set({
      [CAPTURED_REQUESTS_KEY]: updated
    });
  },
  { urls: ["<all_urls>"] }
);

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) {
    return;
  }

  void chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: "dist/sidepanel.html",
    enabled: true
  });

  void chrome.sidePanel.open({ tabId: tab.id });
});

const isCapturableRequest = (details: chrome.webRequest.WebRequestBodyDetails): boolean =>
  details.tabId >= 0 && !details.url.startsWith("chrome-extension://");

const readCapturedRequests = (value: unknown): CapturedRequest[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isCapturedRequest);
};

const loadRules = async (): Promise<Rule[]> => {
  const stored = await chrome.storage.local.get(RULES_KEY);
  const rules = readRules(stored[RULES_KEY]);

  return rules.length > 0 ? rules : DEFAULT_RULES;
};

const seedDefaultRules = async () => {
  const stored = await chrome.storage.local.get(RULES_KEY);

  if (Array.isArray(stored[RULES_KEY])) {
    return;
  }

  await chrome.storage.local.set({
    [RULES_KEY]: DEFAULT_RULES
  });
};

const readRules = (value: unknown): Rule[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRule);
};

const isRule = (value: unknown): value is Rule => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.enabled === "boolean" &&
    typeof candidate.priority === "number" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.condition === "object" &&
    candidate.condition !== null &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
};

const isCapturedRequest = (value: unknown): value is CapturedRequest => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.method === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.headers === "object" &&
    candidate.headers !== null &&
    typeof candidate.timestamp === "string" &&
    typeof candidate.startedAtMs === "number" &&
    Array.isArray(candidate.matchedRules) &&
    candidate.matchedRules.every(isMatchedRule) &&
    (candidate.response === undefined || isCapturedResponse(candidate.response))
  );
};

const isMatchedRule = (value: unknown): value is MatchedRule => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.ruleId === "string" &&
    typeof candidate.ruleName === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
};

const isCapturedResponse = (value: unknown): value is CapturedResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.status === "number" &&
    typeof candidate.durationMs === "number" &&
    typeof candidate.timestamp === "string"
  );
};