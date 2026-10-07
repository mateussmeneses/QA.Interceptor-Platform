import {
  evaluateRules,
  describeRuleCoverage,
  type MatchedRule
} from "../../../packages/rule-engine/src/index";
import type { InterceptedRequest, Rule, RuleGroup } from "../../../packages/shared-types/src/index";

const CAPTURED_REQUESTS_KEY = "capturedRequests";
const RULES_KEY = "rules";
const RULE_GROUPS_KEY = "ruleGroups";
const RULE_VALIDATION_KEY = "ruleValidation";
const MAX_CAPTURED_REQUESTS = 100;
const DYNAMIC_RULE_ID_BASE = 1;
const GROUP_PRIORITY_MULTIPLIER = 100000;

let syncDynamicRulesInFlight: Promise<void> = Promise.resolve();

type CapturedRequest = InterceptedRequest & {
  captureSource: "network" | "mock";
  resourceType?: string;
  tabId?: number;
  startedAtMs: number;
  firstByteAtMs?: number;
  matchedRules: MatchedRule[];
  response?: CapturedResponse;
};

type CapturedResponse = {
  status: number;
  durationMs: number;
  timestamp: string;
  body?: string;
  headers?: Record<string, string>;
  waitingMs?: number;
  downloadMs?: number;
};

type RewriteUrlPayload = {
  replaceWith: string;
};

type RewriteHeaderPayload = {
  operations: Array<{
    header: string;
    operation: "set" | "remove";
    value?: string;
  }>;
};

type RewriteQueryPayload = {
  addOrReplace?: Array<{ key: string; value: string }>;
  remove?: string[];
};

type RedirectPayload = {
  redirectTo: string;
};

type MockAppliedPayload = {
  requestId: string;
  method: string;
  url: string;
  timestamp: string;
  status: number;
  durationMs: number;
  responseBody?: string;
  matchedRules: MatchedRule[];
};

type RepeatRequestPayload = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
};

type ResponseBodyCapturedPayload = {
  method: string;
  url: string;
  status: number;
  body: string;
  timestamp: string;
};

type RuleValidation = {
  timestamp: string;
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
};

const DEFAULT_RULES: Rule[] = [
  {
    id: "mk-001",
    name: "MK001 Mock static users response",
    type: "mock-response",
    enabled: true,
    priority: 0,
    groupId: "grp-core",
    createdAt: "2026-06-09T00:00:00.000Z",
    condition: {
      urlContains: "/api/users"
    },
    payload: {
      body: '{"source":"qa-interceptor","users":[{"id":1,"name":"QA Mock User"}]}'
    }
  },
  {
    id: "mk-002",
    name: "MK002 Override status for users mock",
    type: "mock-status",
    enabled: true,
    priority: 1,
    groupId: "grp-core",
    createdAt: "2026-06-09T00:00:01.000Z",
    condition: {
      urlContains: "/api/users"
    },
    payload: {
      status: 202
    }
  },
  {
    id: "rw-001",
    name: "RW001 Rewrite /api to /qa-api",
    type: "rewrite-url",
    enabled: true,
    priority: 10,
    groupId: "grp-core",
    createdAt: "2026-06-09T00:00:10.000Z",
    condition: {
      urlContains: "/api"
    },
    payload: {
      replaceWith: "/qa-api"
    }
  },
  {
    id: "rw-002",
    name: "RW002 Set x-qa-interceptor header",
    type: "rewrite-header",
    enabled: true,
    priority: 11,
    groupId: "grp-core",
    createdAt: "2026-06-09T00:00:11.000Z",
    condition: {
      urlContains: "/api"
    },
    payload: {
      operations: [
        {
          header: "x-qa-interceptor",
          operation: "set",
          value: "enabled"
        }
      ]
    }
  },
  {
    id: "ns-001",
    name: "NS001 Block tracking calls",
    type: "block",
    enabled: false,
    priority: 90,
    groupId: "grp-experiments",
    createdAt: "2026-06-09T00:00:55.000Z",
    condition: {
      urlContains: "/tracking"
    },
    payload: {}
  },
  {
    id: "ns-003",
    name: "NS003 Redirect admin route",
    type: "redirect",
    enabled: false,
    priority: 91,
    groupId: "grp-experiments",
    createdAt: "2026-06-09T00:00:56.000Z",
    condition: {
      urlContains: "/admin"
    },
    payload: {
      redirectTo: "https://example.com/qa-admin"
    }
  },
  {
    id: "ns-002",
    name: "NS002 Delay checkout calls",
    type: "delay",
    enabled: false,
    priority: 92,
    groupId: "grp-experiments",
    createdAt: "2026-06-09T00:00:57.000Z",
    condition: {
      urlContains: "/checkout"
    },
    payload: {
      delayMs: 1200
    }
  }
];

chrome.runtime.onInstalled.addListener(() => {
  console.log("QA.Interceptor installed");
  void (async () => {
    await seedDefaultRuleGroups();
    await seedDefaultRules();
    await queueSyncDynamicRules();
  })();
});

chrome.runtime.onStartup.addListener(() => {
  void queueSyncDynamicRules();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || (!changes[RULES_KEY] && !changes[RULE_GROUPS_KEY])) {
    return;
  }

  void queueSyncDynamicRules();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return;
  }

  const normalized = message as { type?: string; payload?: unknown };

  if (normalized.type === "REPEAT_REQUEST") {
    const payload = readRepeatRequestPayload(normalized.payload);

    if (!payload) {
      sendResponse({ ok: false, error: "Invalid repeat request payload" });
      return;
    }

    void repeatRequest(payload)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown replay error"
        });
      });

    return true;
  }

  if (normalized.type === "RESPONSE_BODY_CAPTURED") {
    const payload = readResponseBodyCapturedPayload(normalized.payload);

    if (payload) {
      void attachResponseBody(payload);
    }

    return;
  }

  if (normalized.type !== "MOCK_APPLIED") {
    return;
  }

  const payload = readMockAppliedPayload(normalized.payload);

  if (!payload) {
    return;
  }

  void appendMockedRequest(payload);
});

chrome.webRequest.onBeforeRequest.addListener(
  (details): undefined => {
    void (async () => {
      if (!isCapturableRequest(details)) {
        return;
      }

      const request = {
        id: details.requestId,
        method: details.method as InterceptedRequest["method"],
        url: details.url,
        headers: {},
        timestamp: new Date().toISOString(),
        captureSource: "network" as const,
        resourceType: details.type,
        tabId: details.tabId,
        startedAtMs: details.timeStamp,
        matchedRules: []
      };

      const rules = await loadRulesForRuntime();
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
    })();
  },
  { urls: ["<all_urls>"] }
);

// QAI-015: capture the real outgoing request headers (Authorization, Cookie, etc.)
// so Repeat / Edit-and-resend / Compose can reuse the original auth token instead
// of replaying with an empty header set (which previously caused 403 responses).
// `onBeforeRequest` cannot see headers, so we merge them in here once they are sent.
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    void (async () => {
      if (!isCapturableRequest(details)) {
        return;
      }

      const requestHeaders = Object.fromEntries(
        (details.requestHeaders ?? [])
          .filter((header) => typeof header.value === "string")
          .map((header) => [header.name, header.value as string])
      );

      if (Object.keys(requestHeaders).length === 0) {
        return;
      }

      const stored = await chrome.storage.local.get(CAPTURED_REQUESTS_KEY);
      const existing = readCapturedRequests(stored[CAPTURED_REQUESTS_KEY]);
      let changed = false;
      const updated = existing.map((request) => {
        if (request.id !== details.requestId) {
          return request;
        }

        changed = true;
        return { ...request, headers: requestHeaders };
      });

      if (changed) {
        await chrome.storage.local.set({
          [CAPTURED_REQUESTS_KEY]: updated
        });
      }
    })();
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);

chrome.webRequest.onResponseStarted.addListener(
  (details) => {
    void (async () => {
      if (!isCapturableRequest(details)) {
        return;
      }

      // PERF-002: onResponseStarted fires when the first byte of the response
      // arrives, letting us derive an honest time-to-first-byte signal.
      const stored = await chrome.storage.local.get(CAPTURED_REQUESTS_KEY);
      const existing = readCapturedRequests(stored[CAPTURED_REQUESTS_KEY]);
      let changed = false;
      const updated = existing.map((request) => {
        if (request.id !== details.requestId || typeof request.firstByteAtMs === "number") {
          return request;
        }

        changed = true;
        return { ...request, firstByteAtMs: details.timeStamp };
      });

      if (changed) {
        await chrome.storage.local.set({
          [CAPTURED_REQUESTS_KEY]: updated
        });
      }
    })();
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    void (async () => {
      if (!isCapturableRequest(details)) {
        return;
      }

      const stored = await chrome.storage.local.get(CAPTURED_REQUESTS_KEY);
      const existing = readCapturedRequests(stored[CAPTURED_REQUESTS_KEY]);
      const responseHeaders = Object.fromEntries(
        Object.entries(details.responseHeaders ?? {}).map(([key, values]) => [
          key,
          Array.isArray(values) ? values.join(",") : values
        ])
      );
      const updated = existing.map((request) => {
        if (request.id !== details.requestId) {
          return request;
        }

        const durationMs = Math.max(0, Math.round(details.timeStamp - request.startedAtMs));
        // PERF-002: split total time into waiting (time-to-first-byte) and download
        // (transfer) using the onResponseStarted signal, when available.
        const timing =
          typeof request.firstByteAtMs === "number"
            ? {
                waitingMs: Math.max(0, Math.round(request.firstByteAtMs - request.startedAtMs)),
                downloadMs: Math.max(0, Math.round(details.timeStamp - request.firstByteAtMs))
              }
            : {};

        return {
          ...request,
          response: {
            status: details.statusCode,
            durationMs,
            timestamp: new Date(details.timeStamp).toISOString(),
            headers: responseHeaders,
            ...timing,
            // QAI-016: attach a page-level body that arrived before onCompleted.
            ...(() => {
              const body = takePendingResponseBody(request.method, request.url);
              return body !== undefined ? { body } : {};
            })()
          }
        };
      });

      await chrome.storage.local.set({
        [CAPTURED_REQUESTS_KEY]: updated
      });
    })();
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

// QAI-003 / ADR-009: Insert Scripts. On navigation completion, inject the code
// of every enabled `insert-script` rule whose condition matches the tab URL,
// using chrome.scripting in the MAIN world (CSP-proof, browser-injected).
const INSERT_SCRIPT_BLOCKED_PREFIXES = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "https://chrome.google.com/webstore",
  "https://chromewebstore.google.com"
];

const isInjectableUrl = (url: string): boolean =>
  /^https?:\/\//.test(url) &&
  !INSERT_SCRIPT_BLOCKED_PREFIXES.some((prefix) => url.startsWith(prefix));

const readInsertScriptCode = (payload: Record<string, unknown>): string | null => {
  const code = payload.code;
  return typeof code === "string" && code.trim().length > 0 ? code : null;
};

const readInjectCssCode = (payload: Record<string, unknown>): string | null => {
  const css = payload.css;
  return typeof css === "string" && css.trim().length > 0 ? css : null;
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url || !isInjectableUrl(tab.url)) {
    return;
  }

  const tabUrl = tab.url;

  void (async () => {
    const rules = await loadRulesForRuntime();
    const request: InterceptedRequest = {
      id: `nav-${String(tabId)}-${String(Date.now())}`,
      method: "GET",
      url: tabUrl,
      headers: {},
      timestamp: new Date().toISOString()
    };

    const evaluation = evaluateRules(rules, request);
    const scripts = evaluation.matchedRules
      .filter((matched) => matched.type === "insert-script")
      .map((matched) => readInsertScriptCode(matched.payload))
      .filter((code): code is string => code !== null);

    for (const code of scripts) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          world: "MAIN",
          args: [code],
          func: (userCode: string) => {
            try {
              new Function(userCode)();
            } catch (error) {
              console.error("[QA.Interceptor] insert-script error", error);
            }
          }
        });
      } catch (error) {
        console.warn("[QA.Interceptor] insert-script injection failed", error);
      }
    }

    // QAI-004: inject CSS for matching `inject-css` rules (reuses the same trail).
    const styles = evaluation.matchedRules
      .filter((matched) => matched.type === "inject-css")
      .map((matched) => readInjectCssCode(matched.payload))
      .filter((css): css is string => css !== null);

    for (const css of styles) {
      try {
        await chrome.scripting.insertCSS({ target: { tabId }, css });
      } catch (error) {
        console.warn("[QA.Interceptor] inject-css injection failed", error);
      }
    }
  })();
});

const isCapturableRequest = (details: { tabId: number; url: string }): boolean =>
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

const loadRuleGroups = async (): Promise<RuleGroup[]> => {
  const stored = await chrome.storage.local.get(RULE_GROUPS_KEY);
  const groups = readRuleGroups(stored[RULE_GROUPS_KEY]);

  return groups.length > 0 ? groups : DEFAULT_RULE_GROUPS;
};

const loadRulesForRuntime = async (): Promise<Rule[]> => {
  const [rules, groups] = await Promise.all([loadRules(), loadRuleGroups()]);
  const enabledGroups = new Map(
    groups.filter((group) => group.enabled).map((group) => [group.id, group] as const)
  );

  return rules
    .filter((rule) => {
      if (!rule.groupId) {
        return true;
      }

      return enabledGroups.has(rule.groupId);
    })
    .map((rule) => {
      if (!rule.groupId) {
        return rule;
      }

      const group = enabledGroups.get(rule.groupId);

      if (!group) {
        return rule;
      }

      return {
        ...rule,
        priority: group.priority * GROUP_PRIORITY_MULTIPLIER + rule.priority
      };
    });
};

const queueSyncDynamicRules = (): Promise<void> => {
  syncDynamicRulesInFlight = syncDynamicRulesInFlight
    .catch(() => {
      // Keep the queue alive if a previous run failed.
    })
    .then(syncDynamicRules);

  return syncDynamicRulesInFlight;
};

const syncDynamicRules = async () => {
  const rules = await loadRulesForRuntime();
  const nextDynamicRules = dedupeDynamicRuleIds(buildDynamicRules(rules));
  const existingDynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
  const validation = buildRuleValidation(rules, nextDynamicRules);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingDynamicRules.map((rule) => rule.id),
    addRules: nextDynamicRules
  });

  await chrome.storage.local.set({
    [RULE_VALIDATION_KEY]: validation
  });
};

const buildRuleValidation = (
  rules: Rule[],
  dynamicRules: chrome.declarativeNetRequest.Rule[]
): RuleValidation => {
  const enabledRewriteRules = rules.filter(
    (rule) => rule.enabled && (rule.type === "rewrite-url" || rule.type === "rewrite-header")
  );
  const enabledMockRules = rules.filter(
    (rule) => rule.enabled && (rule.type === "mock-response" || rule.type === "mock-status")
  );
  const enabledDelayRules = rules.filter((rule) => rule.enabled && rule.type === "delay");

  const checks: RuleValidation["checks"] = [
    {
      name: "rewrite-rules-enabled",
      passed: enabledRewriteRules.length > 0,
      details:
        enabledRewriteRules.length > 0
          ? `${enabledRewriteRules.length} rewrite rule(s) enabled`
          : "No rewrite rules enabled"
    },
    {
      name: "mock-rules-enabled",
      passed: enabledMockRules.length > 0,
      details:
        enabledMockRules.length > 0
          ? `${enabledMockRules.length} mock rule(s) enabled`
          : "No mock rules enabled"
    },
    {
      name: "delay-rules-enabled",
      passed: enabledDelayRules.length > 0,
      details:
        enabledDelayRules.length > 0
          ? `${enabledDelayRules.length} delay rule(s) enabled`
          : "No delay rules enabled"
    },
    {
      name: "dnr-supported-actions-only",
      passed: dynamicRules.every(
        (rule) =>
          rule.action.type === "redirect" ||
          rule.action.type === "modifyHeaders" ||
          rule.action.type === "block"
      ),
      details: "DNR updates include only supported actions (redirect/modifyHeaders/block)"
    },
    {
      name: "dynamic-rule-id-unique",
      passed: new Set(dynamicRules.map((rule) => rule.id)).size === dynamicRules.length,
      details: "Dynamic rules applied without duplicate IDs"
    }
  ];

  return {
    timestamp: new Date().toISOString(),
    passed: checks.every((check) => check.passed),
    checks
  };
};

const dedupeDynamicRuleIds = (
  rules: chrome.declarativeNetRequest.Rule[]
): chrome.declarativeNetRequest.Rule[] => {
  const usedIds = new Set<number>();

  return rules.map((rule) => {
    let nextId = rule.id;

    while (usedIds.has(nextId)) {
      nextId += 1;
    }

    usedIds.add(nextId);

    return {
      ...rule,
      id: nextId
    };
  });
};

const appendMockedRequest = async (payload: MockAppliedPayload) => {
  const stored = await chrome.storage.local.get(CAPTURED_REQUESTS_KEY);
  const existing = readCapturedRequests(stored[CAPTURED_REQUESTS_KEY]);

  const mockedRequest: CapturedRequest = {
    id: payload.requestId,
    method: payload.method as InterceptedRequest["method"],
    url: payload.url,
    headers: {
      "x-qa-interceptor": "mocked"
    },
    timestamp: payload.timestamp,
    captureSource: "mock",
    resourceType: "xmlhttprequest",
    tabId: -1,
    startedAtMs: Date.parse(payload.timestamp),
    matchedRules: payload.matchedRules,
    response: {
      status: payload.status,
      durationMs: payload.durationMs,
      timestamp: payload.timestamp,
      ...(payload.responseBody !== undefined ? { body: payload.responseBody } : {})
    }
  };

  await chrome.storage.local.set({
    [CAPTURED_REQUESTS_KEY]: [mockedRequest, ...existing].slice(0, MAX_CAPTURED_REQUESTS)
  });
};

// QAI-015: headers the fetch() API forbids the page from setting (the browser
// manages them itself). We drop them so the replay does not throw or send stale
// values; cookies are re-sent via `credentials: "include"`.
const FORBIDDEN_REPLAY_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "cookie",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection"
]);

const sanitizeReplayHeaders = (
  headers: Record<string, string> | undefined
): Record<string, string> => {
  if (!headers) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !FORBIDDEN_REPLAY_HEADERS.has(name.toLowerCase()))
  );
};

const repeatRequest = async (
  payload: RepeatRequestPayload
): Promise<{
  ok: boolean;
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  error?: string;
}> => {
  const requestId = `repeat-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const startedAtMs = Date.now();
  const timestamp = new Date(startedAtMs).toISOString();

  const request: InterceptedRequest = {
    id: requestId,
    method: payload.method as InterceptedRequest["method"],
    url: payload.url,
    headers: payload.headers ?? {},
    ...(payload.body !== undefined ? { body: payload.body } : {}),
    timestamp
  };

  const rules = await loadRulesForRuntime();
  const evaluation = evaluateRules(rules, request);

  // GET/HEAD requests cannot carry a body (fetch throws otherwise).
  const methodUpper = payload.method.toUpperCase();
  const allowsBody = methodUpper !== "GET" && methodUpper !== "HEAD";
  const sendBody = allowsBody && payload.body !== undefined;

  // QAI-015: strip headers the fetch() API forbids or that would corrupt the
  // replay (the browser sets these itself). Cookies are re-sent automatically
  // via `credentials: "include"`, so the original auth/session is reused.
  const replayHeaders = sanitizeReplayHeaders(payload.headers);

  const response = await fetch(payload.url, {
    method: payload.method,
    headers: replayHeaders,
    credentials: "include",
    ...(sendBody ? { body: payload.body } : {})
  });

  const responseText = await response.text();
  const finishedAt = Date.now();

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key.toLowerCase()] = value;
  });

  const replayedRequest: CapturedRequest = {
    ...request,
    captureSource: "network",
    resourceType: "xmlhttprequest",
    tabId: -1,
    startedAtMs,
    matchedRules: evaluation.matchedRules,
    response: {
      status: response.status,
      durationMs: Math.max(0, finishedAt - startedAtMs),
      timestamp: new Date(finishedAt).toISOString(),
      headers: responseHeaders,
      ...(responseText ? { body: responseText } : {})
    }
  };

  const stored = await chrome.storage.local.get(CAPTURED_REQUESTS_KEY);
  const existing = readCapturedRequests(stored[CAPTURED_REQUESTS_KEY]);

  await chrome.storage.local.set({
    [CAPTURED_REQUESTS_KEY]: [replayedRequest, ...existing].slice(0, MAX_CAPTURED_REQUESTS)
  });

  return {
    ok: true,
    status: response.status,
    headers: responseHeaders,
    ...(responseText ? { body: responseText } : {})
  };
};

const buildDynamicRules = (rules: Rule[]): chrome.declarativeNetRequest.Rule[] => {
  const mappedRules = rules
    .filter((rule) => rule.enabled)
    .map(toDynamicRule)
    .filter((rule): rule is Omit<chrome.declarativeNetRequest.Rule, "id"> => Boolean(rule));

  return mappedRules.map((rule, index) => ({
    ...rule,
    id: DYNAMIC_RULE_ID_BASE + index
  }));
};

const toDynamicRule = (rule: Rule): Omit<chrome.declarativeNetRequest.Rule, "id"> | null => {
  const coverage = describeRuleCoverage(rule);

  // QAI-001 / ADR-008: mirror the engine. A method-only rule (no urlContains)
  // matches every URL, so emit a match-all regexFilter instead of dropping it.
  // Exception: rewrite-url's `$1..$2` substitution needs the URL capture groups,
  // so that type still requires an explicit urlContains.
  if (coverage.matchesAllUrls && rule.type === "rewrite-url") {
    return null;
  }

  const commonCondition: chrome.declarativeNetRequest.RuleCondition = {
    regexFilter: coverage.matchesAllUrls
      ? "^.*$"
      : `^(.*)${escapeRegex(rule.condition.urlContains ?? "")}(.*)$`
  };

  if (rule.condition.method) {
    commonCondition.requestMethods = [
      rule.condition.method.toLowerCase() as chrome.declarativeNetRequest.RequestMethod
    ];
  }

  if (rule.type === "rewrite-url") {
    const payload = readRewriteUrlPayload(rule.payload);

    if (!payload) {
      return null;
    }

    return {
      priority: toDynamicPriority(rule.priority),
      action: {
        type: "redirect",
        redirect: {
          regexSubstitution: `$1${escapeRegexSubstitution(payload.replaceWith)}$2`
        }
      },
      condition: commonCondition
    };
  }

  if (rule.type === "rewrite-header") {
    const payload = readRewriteHeaderPayload(rule.payload);

    if (!payload) {
      return null;
    }

    return {
      priority: toDynamicPriority(rule.priority),
      action: {
        type: "modifyHeaders",
        requestHeaders: payload.operations.map((operation) =>
          operation.operation === "remove"
            ? {
                header: operation.header,
                operation: "remove"
              }
            : {
                header: operation.header,
                operation: "set",
                value: operation.value ?? ""
              }
        )
      },
      condition: commonCondition
    };
  }

  if (rule.type === "redirect") {
    const payload = readRedirectPayload(rule.payload);

    if (!payload) {
      return null;
    }

    return {
      priority: toDynamicPriority(rule.priority),
      action: {
        type: "redirect",
        redirect: {
          url: payload.redirectTo
        }
      },
      condition: commonCondition
    };
  }

  if (rule.type === "block") {
    return {
      priority: toDynamicPriority(rule.priority),
      action: {
        type: "block"
      },
      condition: commonCondition
    };
  }

  if (rule.type === "rewrite-query") {
    const payload = readRewriteQueryPayload(rule.payload);

    if (!payload) {
      return null;
    }

    const queryTransform: chrome.declarativeNetRequest.QueryTransform = {};

    if (payload.addOrReplace && payload.addOrReplace.length > 0) {
      queryTransform.addOrReplaceParams = payload.addOrReplace;
    }

    if (payload.remove && payload.remove.length > 0) {
      queryTransform.removeParams = payload.remove;
    }

    if (!queryTransform.addOrReplaceParams && !queryTransform.removeParams) {
      return null;
    }

    return {
      priority: toDynamicPriority(rule.priority),
      action: {
        type: "redirect",
        redirect: {
          transform: { queryTransform }
        }
      },
      condition: commonCondition
    };
  }

  return null;
};

const toDynamicPriority = (priority: number): number => {
  const normalized = Number.isFinite(priority)
    ? Math.max(0, Math.min(9999, Math.round(priority)))
    : 0;
  return 10000 - normalized;
};

const readRewriteUrlPayload = (payload: Rule["payload"]): RewriteUrlPayload | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;

  if (typeof candidate.replaceWith !== "string") {
    return null;
  }

  return {
    replaceWith: candidate.replaceWith
  };
};

const readRewriteHeaderPayload = (payload: Rule["payload"]): RewriteHeaderPayload | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;

  if (!Array.isArray(candidate.operations)) {
    return null;
  }

  const operations = candidate.operations.filter(isRewriteHeaderOperation);

  if (operations.length === 0) {
    return null;
  }

  return {
    operations
  };
};

const readRedirectPayload = (payload: Rule["payload"]): RedirectPayload | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;

  if (typeof candidate.redirectTo !== "string") {
    return null;
  }

  try {
    new URL(candidate.redirectTo);
  } catch {
    return null;
  }

  return {
    redirectTo: candidate.redirectTo
  };
};

const readRewriteQueryPayload = (payload: Rule["payload"]): RewriteQueryPayload | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const result: RewriteQueryPayload = {};

  if (Array.isArray(candidate.addOrReplace)) {
    result.addOrReplace = candidate.addOrReplace.filter(
      (item): item is { key: string; value: string } =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).key === "string" &&
        typeof (item as Record<string, unknown>).value === "string"
    );
  }

  if (Array.isArray(candidate.remove)) {
    result.remove = candidate.remove.filter((item): item is string => typeof item === "string");
  }

  if (!result.addOrReplace?.length && !result.remove?.length) {
    return null;
  }

  return result;
};

const isRewriteHeaderOperation = (
  value: unknown
): value is RewriteHeaderPayload["operations"][number] => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.header !== "string") {
    return false;
  }

  if (candidate.operation !== "set" && candidate.operation !== "remove") {
    return false;
  }

  if (candidate.operation === "set" && typeof candidate.value !== "string") {
    return false;
  }

  return true;
};

const readMockAppliedPayload = (value: unknown): MockAppliedPayload | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.requestId !== "string" ||
    typeof candidate.method !== "string" ||
    typeof candidate.url !== "string" ||
    typeof candidate.timestamp !== "string" ||
    typeof candidate.status !== "number" ||
    typeof candidate.durationMs !== "number" ||
    !Array.isArray(candidate.matchedRules)
  ) {
    return null;
  }

  const matchedRules = candidate.matchedRules.filter(isMatchedRule);

  return {
    requestId: candidate.requestId,
    method: candidate.method,
    url: candidate.url,
    timestamp: candidate.timestamp,
    status: candidate.status,
    durationMs: candidate.durationMs,
    ...(typeof candidate.responseBody === "string" ? { responseBody: candidate.responseBody } : {}),
    matchedRules
  };
};

const readResponseBodyCapturedPayload = (value: unknown): ResponseBodyCapturedPayload | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.method !== "string" ||
    typeof candidate.url !== "string" ||
    typeof candidate.status !== "number" ||
    typeof candidate.body !== "string" ||
    typeof candidate.timestamp !== "string"
  ) {
    return null;
  }

  return {
    method: candidate.method,
    url: candidate.url,
    status: candidate.status,
    body: candidate.body,
    timestamp: candidate.timestamp
  };
};

// QAI-016: page-level response bodies can arrive before OR after webRequest's
// onCompleted finalizes the captured request. We attach to the newest matching
// capture that still lacks a body; if none exists yet, we buffer the body so
// onCompleted can pick it up when it stores the response.
const PENDING_RESPONSE_BODY_LIMIT = 50;
const pendingResponseBodies = new Map<string, string>();

const responseBodyKey = (method: string, url: string): string => `${method.toUpperCase()} ${url}`;

const takePendingResponseBody = (method: string, url: string): string | undefined => {
  const key = responseBodyKey(method, url);
  const body = pendingResponseBodies.get(key);

  if (body !== undefined) {
    pendingResponseBodies.delete(key);
  }

  return body;
};

const attachResponseBody = async (payload: ResponseBodyCapturedPayload): Promise<void> => {
  const stored = await chrome.storage.local.get(CAPTURED_REQUESTS_KEY);
  const existing = readCapturedRequests(stored[CAPTURED_REQUESTS_KEY]);

  let attached = false;
  const updated = existing.map((request) => {
    if (
      attached ||
      request.method.toUpperCase() !== payload.method.toUpperCase() ||
      request.url !== payload.url ||
      !request.response ||
      typeof request.response.body === "string"
    ) {
      return request;
    }

    attached = true;
    return {
      ...request,
      response: { ...request.response, body: payload.body }
    };
  });

  if (attached) {
    await chrome.storage.local.set({ [CAPTURED_REQUESTS_KEY]: updated });
    return;
  }

  // onCompleted has not stored the response yet — buffer the body for it.
  if (pendingResponseBodies.size >= PENDING_RESPONSE_BODY_LIMIT) {
    const oldestKey = pendingResponseBodies.keys().next().value;
    if (oldestKey !== undefined) {
      pendingResponseBodies.delete(oldestKey);
    }
  }
  pendingResponseBodies.set(responseBodyKey(payload.method, payload.url), payload.body);
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeRegexSubstitution = (value: string): string => value.replaceAll("$", "$$");

const seedDefaultRules = async () => {
  const stored = await chrome.storage.local.get(RULES_KEY);

  if (Array.isArray(stored[RULES_KEY])) {
    return;
  }

  await chrome.storage.local.set({
    [RULES_KEY]: DEFAULT_RULES
  });
};

const seedDefaultRuleGroups = async () => {
  const stored = await chrome.storage.local.get(RULE_GROUPS_KEY);

  if (Array.isArray(stored[RULE_GROUPS_KEY])) {
    return;
  }

  await chrome.storage.local.set({
    [RULE_GROUPS_KEY]: DEFAULT_RULE_GROUPS
  });
};

const readRules = (value: unknown): Rule[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRule);
};

const readRuleGroups = (value: unknown): RuleGroup[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRuleGroup);
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
    (candidate.groupId === undefined || typeof candidate.groupId === "string") &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.condition === "object" &&
    candidate.condition !== null &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
};

const isRuleGroup = (value: unknown): value is RuleGroup => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.enabled === "boolean" &&
    typeof candidate.priority === "number" &&
    typeof candidate.createdAt === "string"
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

const readRepeatRequestPayload = (value: unknown): RepeatRequestPayload | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.method !== "string" || typeof candidate.url !== "string") {
    return null;
  }

  const normalizedMethod = candidate.method.toUpperCase();
  const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);

  if (!allowedMethods.has(normalizedMethod)) {
    return null;
  }

  const headers =
    candidate.headers && typeof candidate.headers === "object" && !Array.isArray(candidate.headers)
      ? Object.fromEntries(
          Object.entries(candidate.headers as Record<string, unknown>).map(([key, headerValue]) => [
            key,
            String(headerValue)
          ])
        )
      : {};

  return {
    method: normalizedMethod,
    url: candidate.url,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(typeof candidate.body === "string" ? { body: candidate.body } : {})
  };
};

const DEFAULT_RULE_GROUPS: RuleGroup[] = [
  {
    id: "grp-core",
    name: "Core",
    enabled: true,
    priority: 0,
    createdAt: "2026-06-09T00:00:00.000Z"
  },
  {
    id: "grp-experiments",
    name: "Experiments",
    enabled: false,
    priority: 1,
    createdAt: "2026-06-09T00:00:01.000Z"
  }
];
