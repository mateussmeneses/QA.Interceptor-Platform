export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

export type RuleType =
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

export type Rule = {
  id: string;
  name: string;
  type: RuleType;
  enabled: boolean;
  priority: number;
  groupId?: string;
  createdAt: string;
  condition: {
    urlContains?: string;
    method?: HttpMethod;
  };
  payload: Record<string, unknown>;
};

export type RuleGroup = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  createdAt: string;
};

export type InterceptedRequest = {
  id: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: string;
};

export type InterceptedResponse = {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  body?: string;
  durationMs: number;
  timestamp: string;
};
export type ResponseAssertionType = "status" | "header" | "json-path" | "body-contains";

export type ResponseAssertion = {
  id: string;
  type: ResponseAssertionType;
  enabled: boolean;
  actual?: string | number;
  expected: string | number;
  path?: string;
  error?: string;
};

export type ResponseAssertionPreset = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  assertions: ResponseAssertion[];
  createdAt: string;
};

export * from "./messages";
