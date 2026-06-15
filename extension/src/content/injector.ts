export {};

import {
  isContentRule,
  isContentMockEnvVar,
  isContentConditionalMock,
  type ContentRule as Rule,
  type ContentMockEnvVar as MockEnvVar,
  type ContentConditionalMock as ConditionalMock
} from "../../../packages/rule-engine/src/content-guards";

const BRIDGE_SCRIPT_ID = "qa-interceptor-mock-bridge";

type MockAppliedMessage = {
  source: "qa-interceptor-page";
  type: "MOCK_APPLIED";
  payload: {
    requestId: string;
    method: string;
    url: string;
    timestamp: string;
    status: number;
    durationMs: number;
    matchedRules: Array<{
      ruleId: string;
      ruleName: string;
      type: string;
      payload: Record<string, unknown>;
    }>;
  };
};

const injectBridgeScript = () => {
  if (document.getElementById(BRIDGE_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = BRIDGE_SCRIPT_ID;
  script.src = chrome.runtime.getURL("dist/mock-bridge.js");
  script.async = false;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
};

const readRules = async (): Promise<Rule[]> => {
  const stored = await chrome.storage.local.get("rules");
  const value = stored.rules;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isContentRule);
};

const readMockEnvVars = async (): Promise<MockEnvVar[]> => {
  const stored = await chrome.storage.local.get("mockEnvVars");
  const value = stored.mockEnvVars;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isContentMockEnvVar);
};

const readConditionalMocks = async (): Promise<ConditionalMock[]> => {
  const stored = await chrome.storage.local.get("conditionalMocks");
  const value = stored.conditionalMocks;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isContentConditionalMock);
};

const publishRules = async () => {
  const [rules, envVars, conditionalMocks] = await Promise.all([
    readRules(),
    readMockEnvVars(),
    readConditionalMocks()
  ]);

  window.postMessage(
    {
      source: "qa-interceptor-content",
      type: "RULES_UPDATE",
      rules,
      envVars,
      conditionalMocks
    },
    "*"
  );
};

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.source !== window || !event.data || typeof event.data !== "object") {
    return;
  }

  const payload = event.data as {
    source?: string;
    type?: string;
    payload?: MockAppliedMessage["payload"];
  };

  if (payload.source !== "qa-interceptor-page" || !payload.payload) {
    return;
  }

  // QAI-016: forward captured real response bodies so the background can attach
  // them to the matching captured request (webRequest cannot read them in MV3).
  if (payload.type === "RESPONSE_BODY_CAPTURED") {
    void chrome.runtime.sendMessage({
      type: "RESPONSE_BODY_CAPTURED",
      payload: payload.payload
    });
    return;
  }

  if (payload.type !== "MOCK_APPLIED") {
    return;
  }

  void chrome.runtime.sendMessage({
    type: "MOCK_APPLIED",
    payload: payload.payload
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName !== "local" ||
    (!changes.rules && !changes.mockEnvVars && !changes.conditionalMocks)
  ) {
    return;
  }

  void publishRules();
});

injectBridgeScript();
void publishRules();
