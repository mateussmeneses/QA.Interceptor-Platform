export {};

import {
  evaluateConditionalMock,
  createMockState,
  type ConditionalMockRule,
  type MockState
} from "../../../packages/rule-engine/src/conditional-mock-evaluator";

type RuleCondition = {
  urlContains?: string;
  method?: string;
};

type Rule = {
  id: string;
  name: string;
  type:
    | "rewrite-url"
    | "rewrite-header"
    | "rewrite-query"
    | "rewrite-response"
    | "rewrite-request-body"
    | "mock-response"
    | "mock-status"
    | "redirect"
    | "block"
    | "delay";
  enabled: boolean;
  priority: number;
  createdAt: string;
  condition: RuleCondition;
  payload: Record<string, unknown>;
};

type MockEnvVar = {
  id: string;
  name: string;
  value: string;
  scopeUrlContains?: string;
  enabled: boolean;
  createdAt: string;
};

type MockResponsePayload = {
  body: string;
  contentType?: string;
  status?: number;
  headers?: Record<string, string>;
};

type MockStatusPayload = {
  status: number;
};

type DelayPayload = {
  delayMs: number;
};

type RewriteResponsePayload = {
  body: string;
  contentType?: string;
};

type RewriteRequestBodyPayload = {
  body: string;
  contentType?: string;
};

/** Stored shape of a sequence conditional mock (INT-005). */
type StoredConditionalMock = {
  id: string;
  name: string;
  enabled: boolean;
  urlContains: string;
  method?: string;
  branches: Array<{ id: string; status: number; body: string }>;
  createdAt: string;
};

declare global {
  interface Window {
    __QA_INTERCEPTOR_MOCK_BRIDGE__?: boolean;
  }
}

let rules: Rule[] = [];
let envVars: MockEnvVar[] = [];
let conditionalMocks: StoredConditionalMock[] = [];
// In-page call-count state for conditional mocks. Resets on page reload.
let conditionalMockState: MockState = createMockState();

if (!window.__QA_INTERCEPTOR_MOCK_BRIDGE__) {
  window.__QA_INTERCEPTOR_MOCK_BRIDGE__ = true;
  const originalFetch = window.fetch.bind(window);

  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== window || !event.data || typeof event.data !== "object") {
      return;
    }

    const payload = event.data as {
      source?: string;
      type?: string;
      rules?: Rule[];
      envVars?: MockEnvVar[];
      conditionalMocks?: StoredConditionalMock[];
    };

    if (
      payload.source !== "qa-interceptor-content" ||
      payload.type !== "RULES_UPDATE" ||
      !Array.isArray(payload.rules)
    ) {
      return;
    }

    rules = payload.rules;

    if (Array.isArray(payload.envVars)) {
      envVars = payload.envVars.filter(isMockEnvVar);
    }

    if (Array.isArray(payload.conditionalMocks)) {
      conditionalMocks = payload.conditionalMocks.filter(isStoredConditionalMock);
    }
  });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requestUrl = resolveUrl(input);
    const requestMethod = resolveMethod(input, init);
    const delayMs = resolveDelayMs(requestUrl, requestMethod);

    // INT-005: state-aware sequence mocks take precedence over static mocks.
    const conditionalResult = resolveConditionalMock(requestUrl, requestMethod);

    if (conditionalResult) {
      if (delayMs > 0) {
        await sleep(delayMs);
      }

      window.postMessage(
        {
          source: "qa-interceptor-page",
          type: "MOCK_APPLIED",
          payload: {
            requestId: crypto.randomUUID(),
            method: requestMethod,
            url: requestUrl,
            timestamp: new Date().toISOString(),
            status: conditionalResult.status,
            durationMs: delayMs,
            responseBody: conditionalResult.body,
            matchedRules: [
              {
                ruleId: conditionalResult.id,
                ruleName: conditionalResult.name,
                type: "mock-response",
                payload: { status: conditionalResult.status, body: conditionalResult.body }
              }
            ]
          }
        },
        "*"
      );

      return new Response(conditionalResult.body, {
        status: conditionalResult.status,
        headers: {
          "content-type": "application/json",
          "x-qa-interceptor": "conditional-mock"
        }
      });
    }

    const match = findMockMatch(requestUrl, requestMethod);
    const requestBodyRewrite = findRequestBodyRewrite(requestUrl, requestMethod);

    let effectiveInit = init;

    if (requestBodyRewrite) {
      const rewrittenHeaders = new Headers(init?.headers);
      rewrittenHeaders.set("content-type", requestBodyRewrite.contentType ?? "application/json");
      effectiveInit = { ...init, body: requestBodyRewrite.body, headers: rewrittenHeaders };
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }

    if (!match) {
      const rewriteResponse = findRewriteResponseRule(requestUrl, requestMethod);

      if (!rewriteResponse) {
        return originalFetch(input, effectiveInit);
      }

      const realResponse = await originalFetch(input, effectiveInit);
      const rewriteContentType = rewriteResponse.contentType ?? "application/json";
      const rewrittenBody = applyDynamicVariables(rewriteResponse.body, {
        method: requestMethod,
        url: requestUrl,
        envVars: resolveScopedEnvVars(requestUrl)
      });

      window.postMessage(
        {
          source: "qa-interceptor-page",
          type: "MOCK_APPLIED",
          payload: {
            requestId: crypto.randomUUID(),
            method: requestMethod,
            url: requestUrl,
            timestamp: new Date().toISOString(),
            status: realResponse.status,
            durationMs: delayMs,
            responseBody: rewrittenBody,
            matchedRules: rewriteResponse.matchedRules
          }
        },
        "*"
      );

      return new Response(rewrittenBody, {
        status: realResponse.status,
        headers: {
          "content-type": rewriteContentType,
          "x-qa-interceptor": "rewrite-response"
        }
      });
    }

    const status = match.statusRule?.status ?? match.responseRule?.status ?? 200;
    const body = applyDynamicVariables(match.responseRule?.body ?? "", {
      method: requestMethod,
      url: requestUrl,
      envVars: resolveScopedEnvVars(requestUrl)
    });
    const contentType = match.responseRule?.contentType ?? "application/json";
    const responseHeaders = {
      ...(match.responseRule?.headers ?? {}),
      "content-type": contentType,
      "x-qa-interceptor": "mocked"
    };

    window.postMessage(
      {
        source: "qa-interceptor-page",
        type: "MOCK_APPLIED",
        payload: {
          requestId: crypto.randomUUID(),
          method: requestMethod,
          url: requestUrl,
          timestamp: new Date().toISOString(),
          status,
          durationMs: delayMs,
          responseBody: body,
          matchedRules: match.matchedRules
        }
      },
      "*"
    );

    return new Response(body, {
      status,
      headers: responseHeaders
    });
  };
}

const resolveUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
};

const resolveDelayMs = (url: string, method: string): number => {
  const enabledRules = rules
    .filter((rule) => rule.enabled)
    .sort((a, b) =>
      a.priority !== b.priority
        ? a.priority - b.priority
        : Date.parse(a.createdAt) - Date.parse(b.createdAt)
    );

  const delayRule = enabledRules.find(
    (rule) => rule.type === "delay" && matchesCondition(rule.condition, url, method)
  );

  if (!delayRule) {
    return 0;
  }

  const payload = readDelayPayload(delayRule.payload);

  if (!payload) {
    return 0;
  }

  return payload.delayMs;
};

const resolveMethod = (input: RequestInfo | URL, init?: RequestInit): string => {
  const initMethod = init?.method;

  if (typeof initMethod === "string") {
    return initMethod.toUpperCase();
  }

  if (input instanceof Request) {
    return input.method.toUpperCase();
  }

  return "GET";
};

const findMockMatch = (url: string, method: string) => {
  const enabledRules = rules
    .filter((rule) => rule.enabled)
    .sort((a, b) =>
      a.priority !== b.priority
        ? a.priority - b.priority
        : Date.parse(a.createdAt) - Date.parse(b.createdAt)
    );

  const matched = enabledRules.filter((rule) => matchesCondition(rule.condition, url, method));

  if (matched.length === 0) {
    return null;
  }

  const responseRuleEntry = matched.find((rule) => rule.type === "mock-response");
  const statusRuleEntry = matched.find((rule) => rule.type === "mock-status");
  const responseRule = responseRuleEntry
    ? readMockResponsePayload(responseRuleEntry.payload)
    : null;
  const statusRule = statusRuleEntry ? readMockStatusPayload(statusRuleEntry.payload) : null;

  if (!responseRule && !statusRule) {
    return null;
  }

  return {
    responseRule,
    statusRule,
    matchedRules: matched.map((rule) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      payload: rule.payload
    }))
  };
};

const matchesCondition = (condition: RuleCondition, url: string, method: string): boolean => {
  if (condition.method && condition.method.toUpperCase() !== method.toUpperCase()) {
    return false;
  }

  if (condition.urlContains && !url.includes(condition.urlContains)) {
    return false;
  }

  return true;
};

const readMockResponsePayload = (payload: Record<string, unknown>): MockResponsePayload | null => {
  if (!("body" in payload)) {
    return null;
  }

  const rawBody = payload.body;

  if (
    typeof rawBody !== "string" &&
    (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody))
  ) {
    return null;
  }

  const body = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);

  const normalized: MockResponsePayload = {
    body
  };

  if (typeof payload.contentType === "string") {
    normalized.contentType = payload.contentType;
  } else if (typeof rawBody === "object") {
    normalized.contentType = "application/json";
  } else {
    normalized.contentType = "text/plain";
  }

  if (typeof payload.status === "number") {
    normalized.status = payload.status;
  }

  if (payload.headers && typeof payload.headers === "object" && !Array.isArray(payload.headers)) {
    normalized.headers = Object.fromEntries(
      Object.entries(payload.headers as Record<string, unknown>).map(([key, value]) => [
        key.toLowerCase(),
        String(value)
      ])
    );
  }

  return normalized;
};

const readMockStatusPayload = (payload: Record<string, unknown>): MockStatusPayload | null => {
  if (typeof payload.status !== "number") {
    return null;
  }

  return {
    status: payload.status
  };
};

const readDelayPayload = (payload: Record<string, unknown>): DelayPayload | null => {
  if (typeof payload.delayMs !== "number") {
    return null;
  }

  const normalized = Math.max(0, Math.round(payload.delayMs));

  return {
    delayMs: normalized
  };
};

const findRequestBodyRewrite = (url: string, method: string): RewriteRequestBodyPayload | null => {
  const enabledRules = rules
    .filter((rule) => rule.enabled)
    .sort((a, b) =>
      a.priority !== b.priority
        ? a.priority - b.priority
        : Date.parse(a.createdAt) - Date.parse(b.createdAt)
    );

  const matched = enabledRules.find(
    (rule) => rule.type === "rewrite-request-body" && matchesCondition(rule.condition, url, method)
  );

  if (!matched) {
    return null;
  }

  return readRewriteRequestBodyPayload(matched.payload);
};

const readRewriteRequestBodyPayload = (
  payload: Record<string, unknown>
): RewriteRequestBodyPayload | null => {
  if (!("body" in payload)) {
    return null;
  }

  const rawBody = payload.body;

  if (
    typeof rawBody !== "string" &&
    (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody))
  ) {
    return null;
  }

  const body = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);

  return {
    body,
    contentType:
      typeof payload.contentType === "string"
        ? payload.contentType
        : typeof rawBody === "object"
          ? "application/json"
          : "text/plain"
  };
};

const findRewriteResponseRule = (url: string, method: string) => {
  const enabledRules = rules
    .filter((rule) => rule.enabled)
    .sort((a, b) =>
      a.priority !== b.priority
        ? a.priority - b.priority
        : Date.parse(a.createdAt) - Date.parse(b.createdAt)
    );

  const matched = enabledRules.filter(
    (rule) => rule.type === "rewrite-response" && matchesCondition(rule.condition, url, method)
  );

  if (matched.length === 0) {
    return null;
  }

  const ruleEntry = matched[0];
  const payload = readRewriteResponsePayload(ruleEntry.payload);

  if (!payload) {
    return null;
  }

  return {
    ...payload,
    matchedRules: matched.map((rule) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      payload: rule.payload
    }))
  };
};

const readRewriteResponsePayload = (
  payload: Record<string, unknown>
): RewriteResponsePayload | null => {
  if (!("body" in payload)) {
    return null;
  }

  const rawBody = payload.body;

  if (
    typeof rawBody !== "string" &&
    (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody))
  ) {
    return null;
  }

  const body = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);

  return {
    body,
    contentType:
      typeof payload.contentType === "string"
        ? payload.contentType
        : typeof rawBody === "object"
          ? "application/json"
          : "text/plain"
  };
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const applyDynamicVariables = (
  template: string,
  context: {
    method: string;
    url: string;
    envVars: Record<string, string>;
  }
): string => {
  const replacements: Record<string, string> = {
    timestamp: new Date().toISOString(),
    uuid:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    method: context.method,
    url: context.url,
    ...context.envVars
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (full, token: string) => {
    const normalized = token.toLowerCase();

    if (normalized.startsWith("env.")) {
      const envKey = normalized.slice(4);
      return envKey in replacements ? replacements[envKey] : full;
    }

    return normalized in replacements ? replacements[normalized] : full;
  });
};

const resolveScopedEnvVars = (url: string): Record<string, string> => {
  const scoped = envVars
    .filter((row) => row.enabled)
    .filter((row) => !row.scopeUrlContains || url.includes(row.scopeUrlContains))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  const map: Record<string, string> = {};

  for (const row of scoped) {
    map[row.name.toLowerCase()] = row.value;
  }

  return map;
};

const isMockEnvVar = (value: unknown): value is MockEnvVar => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.value === "string" &&
    (candidate.scopeUrlContains === undefined || typeof candidate.scopeUrlContains === "string") &&
    typeof candidate.enabled === "boolean" &&
    typeof candidate.createdAt === "string"
  );
};

const isStoredConditionalMock = (value: unknown): value is StoredConditionalMock => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.enabled === "boolean" &&
    typeof candidate.urlContains === "string" &&
    (candidate.method === undefined || typeof candidate.method === "string") &&
    typeof candidate.createdAt === "string" &&
    Array.isArray(candidate.branches)
  );
};

/**
 * INT-005: resolve a state-aware sequence mock for the given request.
 * Converts the stored shape into the rule-engine's ConditionalMockRule, where
 * the nth branch answers the nth matching call and the last branch is the
 * fallback for all subsequent calls. Returns null when nothing matches.
 */
const resolveConditionalMock = (
  url: string,
  method: string
): { id: string; name: string; status: number; body: string } | null => {
  for (const mock of conditionalMocks) {
    if (!mock.enabled || mock.branches.length === 0) {
      continue;
    }

    if (!url.includes(mock.urlContains)) {
      continue;
    }

    if (mock.method && mock.method.toUpperCase() !== method.toUpperCase()) {
      continue;
    }

    const lastBranch = mock.branches[mock.branches.length - 1];
    const rule: ConditionalMockRule = {
      id: mock.id,
      name: mock.name,
      enabled: true,
      branches: mock.branches.map((branch, index) => ({
        id: branch.id,
        condition: { kind: "sequence", nth: index + 1 },
        payload: { status: branch.status, body: branch.body }
      })),
      fallback: { status: lastBranch.status, body: lastBranch.body }
    };

    const result = evaluateConditionalMock(
      rule,
      { method, url, headers: {} },
      conditionalMockState
    );
    conditionalMockState = result.updatedState;

    if (result.matched) {
      return {
        id: mock.id,
        name: mock.name,
        status: result.payload.status ?? 200,
        body: result.payload.body ?? ""
      };
    }
  }

  return null;
};
