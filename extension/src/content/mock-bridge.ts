export {};

import {
  evaluateConditionalMock,
  createMockState,
  type ConditionalMockRule,
  type MockState
} from "../../../packages/rule-engine/src/conditional-mock-evaluator";
import {
  isContentMockEnvVar,
  isContentConditionalMock,
  type ContentRule as Rule,
  type ContentRuleCondition as RuleCondition,
  type ContentMockEnvVar as MockEnvVar,
  type ContentConditionalMock as StoredConditionalMock
} from "../../../packages/rule-engine/src/content-guards";

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
      envVars = payload.envVars.filter(isContentMockEnvVar);
    }

    if (Array.isArray(payload.conditionalMocks)) {
      conditionalMocks = payload.conditionalMocks.filter(isContentConditionalMock);
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

  // CAP-002: intercept XMLHttpRequest so mocks/delay also work on XHR-based clients.
  const XhrProto = window.XMLHttpRequest.prototype;
  const originalOpen = XhrProto.open;
  const originalSend = XhrProto.send;
  const xhrMeta = new WeakMap<XMLHttpRequest, { method: string; url: string }>();

  XhrProto.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ): void {
    xhrMeta.set(this, {
      method: (method || "GET").toUpperCase(),
      url: typeof url === "string" ? url : url.toString()
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalOpen as any).apply(this, [method, url, ...rest]);
  };

  XhrProto.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const meta = xhrMeta.get(this);

    if (!meta) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalSend as any).apply(this, [body]);
    }

    const delayMs = resolveDelayMs(meta.url, meta.method);
    const outcome = resolveMockOutcome(meta.url, meta.method);

    if (!outcome) {
      if (delayMs > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.setTimeout(() => (originalSend as any).apply(this, [body]), delayMs);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalSend as any).apply(this, [body]);
    }

    const deliver = (): void => {
      deliverMockedXhr(this, meta.url, outcome);
      window.postMessage(
        {
          source: "qa-interceptor-page",
          type: "MOCK_APPLIED",
          payload: {
            requestId: crypto.randomUUID(),
            method: meta.method,
            url: meta.url,
            timestamp: new Date().toISOString(),
            status: outcome.status,
            durationMs: delayMs,
            responseBody: outcome.body,
            matchedRules: outcome.matchedRules
          }
        },
        "*"
      );
    };

    if (delayMs > 0) {
      window.setTimeout(deliver, delayMs);
    } else {
      deliver();
    }
  };
}

/**
 * CAP-002: deliver a synthetic XHR response by shadowing the read-only result
 * properties on the instance and dispatching the standard lifecycle events.
 */
const deliverMockedXhr = (xhr: XMLHttpRequest, url: string, outcome: MockOutcome): void => {
  const define = (prop: string, value: unknown): void => {
    Object.defineProperty(xhr, prop, { configurable: true, get: () => value });
  };

  define("readyState", 4);
  define("status", outcome.status);
  define("statusText", outcome.status >= 200 && outcome.status < 300 ? "OK" : "Error");
  define("responseText", outcome.body);
  define("response", outcome.body);
  define("responseURL", url);

  const fire = (type: string): void => {
    xhr.dispatchEvent(new Event(type));
  };

  fire("readystatechange");
  fire("load");
  fire("loadend");
};

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

type MockOutcome = {
  status: number;
  body: string;
  contentType: string;
  matchedRules: Array<{
    ruleId: string;
    ruleName: string;
    type: string;
    payload: Record<string, unknown>;
  }>;
};

/**
 * CAP-002: resolve a synthetic mock response (conditional sequence mock or static
 * mock-response/mock-status) for a request, independent of transport. Shared by the
 * fetch bridge and the XMLHttpRequest bridge. Returns null when nothing mocks the request.
 * Rewrite-response and request-body rewrites are not covered here because they need the
 * real response/request flow (fetch path handles those).
 */
const resolveMockOutcome = (url: string, method: string): MockOutcome | null => {
  const conditional = resolveConditionalMock(url, method);

  if (conditional) {
    return {
      status: conditional.status,
      body: conditional.body,
      contentType: "application/json",
      matchedRules: [
        {
          ruleId: conditional.id,
          ruleName: conditional.name,
          type: "mock-response",
          payload: { status: conditional.status, body: conditional.body }
        }
      ]
    };
  }

  const match = findMockMatch(url, method);

  if (!match) {
    return null;
  }

  const status = match.statusRule?.status ?? match.responseRule?.status ?? 200;
  const body = applyDynamicVariables(match.responseRule?.body ?? "", {
    method,
    url,
    envVars: resolveScopedEnvVars(url)
  });
  const contentType = match.responseRule?.contentType ?? "application/json";

  return { status, body, contentType, matchedRules: match.matchedRules };
};
