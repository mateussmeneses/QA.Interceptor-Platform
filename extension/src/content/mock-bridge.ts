type RuleCondition = {
  urlContains?: string;
  method?: string;
};

type Rule = {
  id: string;
  name: string;
  type: "rewrite-url" | "rewrite-header" | "rewrite-query" | "rewrite-response" | "rewrite-request-body" | "mock-response" | "mock-status" | "redirect" | "block" | "delay";
  enabled: boolean;
  priority: number;
  createdAt: string;
  condition: RuleCondition;
  payload: Record<string, unknown>;
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

declare global {
  interface Window {
    __QA_INTERCEPTOR_MOCK_BRIDGE__?: boolean;
  }
}

let rules: Rule[] = [];

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
    };

    if (payload.source !== "qa-interceptor-content" || payload.type !== "RULES_UPDATE" || !Array.isArray(payload.rules)) {
      return;
    }

    rules = payload.rules;
  });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requestUrl = resolveUrl(input);
    const requestMethod = resolveMethod(input, init);
    const delayMs = resolveDelayMs(requestUrl, requestMethod);
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
            responseBody: rewriteResponse.body,
            matchedRules: rewriteResponse.matchedRules
          }
        },
        "*"
      );

      return new Response(rewriteResponse.body, {
        status: realResponse.status,
        headers: {
          "content-type": rewriteContentType,
          "x-qa-interceptor": "rewrite-response"
        }
      });
    }

    const status = match.statusRule?.status ?? match.responseRule?.status ?? 200;
    const body = match.responseRule?.body ?? "";
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
    .sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : Date.parse(a.createdAt) - Date.parse(b.createdAt)));

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
    .sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : Date.parse(a.createdAt) - Date.parse(b.createdAt)));

  const matched = enabledRules.filter((rule) => matchesCondition(rule.condition, url, method));

  if (matched.length === 0) {
    return null;
  }

  const responseRuleEntry = matched.find((rule) => rule.type === "mock-response");
  const statusRuleEntry = matched.find((rule) => rule.type === "mock-status");
  const responseRule = responseRuleEntry ? readMockResponsePayload(responseRuleEntry.payload) : null;
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
    .sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : Date.parse(a.createdAt) - Date.parse(b.createdAt)));

  const matched = enabledRules.find(
    (rule) => rule.type === "rewrite-request-body" && matchesCondition(rule.condition, url, method)
  );

  if (!matched) {
    return null;
  }

  return readRewriteRequestBodyPayload(matched.payload);
};

const readRewriteRequestBodyPayload = (payload: Record<string, unknown>): RewriteRequestBodyPayload | null => {
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
    contentType: typeof payload.contentType === "string"
      ? payload.contentType
      : typeof rawBody === "object"
        ? "application/json"
        : "text/plain"
  };
};

const findRewriteResponseRule = (url: string, method: string) => {
  const enabledRules = rules
    .filter((rule) => rule.enabled)
    .sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : Date.parse(a.createdAt) - Date.parse(b.createdAt)));

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

const readRewriteResponsePayload = (payload: Record<string, unknown>): RewriteResponsePayload | null => {
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
    contentType: typeof payload.contentType === "string"
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
