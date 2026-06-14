export {};

const BRIDGE_SCRIPT_ID = "qa-interceptor-mock-bridge";

type RuleCondition = {
  urlContains?: string;
  method?: string;
};

type Rule = {
  id: string;
  name: string;
  type: string;
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

  return value.filter((candidate): candidate is Rule => {
    if (!candidate || typeof candidate !== "object") {
      return false;
    }

    const normalized = candidate as Record<string, unknown>;

    return (
      typeof normalized.id === "string" &&
      typeof normalized.name === "string" &&
      typeof normalized.type === "string" &&
      typeof normalized.enabled === "boolean" &&
      typeof normalized.priority === "number" &&
      typeof normalized.createdAt === "string" &&
      typeof normalized.condition === "object" &&
      normalized.condition !== null &&
      typeof normalized.payload === "object" &&
      normalized.payload !== null
    );
  });
};

const readMockEnvVars = async (): Promise<MockEnvVar[]> => {
  const stored = await chrome.storage.local.get("mockEnvVars");
  const value = stored.mockEnvVars;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((candidate): candidate is MockEnvVar => {
    if (!candidate || typeof candidate !== "object") {
      return false;
    }

    const normalized = candidate as Record<string, unknown>;

    return (
      typeof normalized.id === "string" &&
      typeof normalized.name === "string" &&
      typeof normalized.value === "string" &&
      (normalized.scopeUrlContains === undefined ||
        typeof normalized.scopeUrlContains === "string") &&
      typeof normalized.enabled === "boolean" &&
      typeof normalized.createdAt === "string"
    );
  });
};

const publishRules = async () => {
  const [rules, envVars] = await Promise.all([readRules(), readMockEnvVars()]);

  window.postMessage(
    {
      source: "qa-interceptor-content",
      type: "RULES_UPDATE",
      rules,
      envVars
    },
    "*"
  );
};

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (event.source !== window || !event.data || typeof event.data !== "object") {
    return;
  }

  const payload = event.data as Partial<MockAppliedMessage>;

  if (
    payload.source !== "qa-interceptor-page" ||
    payload.type !== "MOCK_APPLIED" ||
    !payload.payload
  ) {
    return;
  }

  void chrome.runtime.sendMessage({
    type: "MOCK_APPLIED",
    payload: payload.payload
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || (!changes.rules && !changes.mockEnvVars)) {
    return;
  }

  void publishRules();
});

injectBridgeScript();
void publishRules();
