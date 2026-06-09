import { evaluateRules, type MatchedRule } from "../../../packages/rule-engine/src/index";
import type { InterceptedRequest, Rule } from "../../../packages/shared-types/src/index";

const CAPTURED_REQUESTS_KEY = "capturedRequests";
const RULES_KEY = "rules";
const MAX_CAPTURED_REQUESTS = 100;
const DYNAMIC_RULE_ID_BASE = 1;

let syncDynamicRulesInFlight: Promise<void> = Promise.resolve();

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

const DEFAULT_RULES: Rule[] = [
  {
    id: "rw-001",
    name: "RW001 Rewrite /api to /qa-api",
    type: "rewrite-url",
    enabled: true,
    priority: 1,
    createdAt: "2026-06-09T00:00:00.000Z",
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
    priority: 2,
    createdAt: "2026-06-09T00:01:00.000Z",
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
  void (async () => {
    await seedDefaultRules();
    await queueSyncDynamicRules();
  })();
});

chrome.runtime.onStartup.addListener(() => {
  void queueSyncDynamicRules();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[RULES_KEY]) {
    return;
  }

  void queueSyncDynamicRules();
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
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

const queueSyncDynamicRules = (): Promise<void> => {
  syncDynamicRulesInFlight = syncDynamicRulesInFlight
    .catch(() => {
      // Keep the queue alive if a previous run failed.
    })
    .then(syncDynamicRules);

  return syncDynamicRulesInFlight;
};

const syncDynamicRules = async () => {
  const rules = await loadRules();
  const nextDynamicRules = dedupeDynamicRuleIds(buildDynamicRules(rules));
  const existingDynamicRules = await chrome.declarativeNetRequest.getDynamicRules();

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingDynamicRules.map((rule) => rule.id),
    addRules: nextDynamicRules
  });
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
  if (!rule.condition.urlContains) {
    return null;
  }

  const commonCondition: chrome.declarativeNetRequest.RuleCondition = {
    regexFilter: `^(.*)${escapeRegex(rule.condition.urlContains)}(.*)$`
  };

  if (rule.condition.method) {
    commonCondition.requestMethods = [rule.condition.method.toLowerCase() as chrome.declarativeNetRequest.RequestMethod];
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

  return null;
};

const toDynamicPriority = (priority: number): number => {
  const normalized = Number.isFinite(priority) ? Math.max(0, Math.min(9999, Math.round(priority))) : 0;
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