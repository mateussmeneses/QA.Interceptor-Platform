export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export type RuleType =
  | "rewrite-url"
  | "rewrite-header"
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
  createdAt: string;
  condition: {
    urlContains?: string;
    method?: HttpMethod;
  };
  payload: Record<string, unknown>;
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