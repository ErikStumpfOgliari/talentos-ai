export type AIProviderMode = "auto" | "local" | "openai";

export function getAIProviderMode(): AIProviderMode {
  const mode = process.env.AI_PROVIDER_MODE?.trim().toLowerCase();

  if (mode === "auto" || mode === "openai") {
    return mode;
  }

  return "local";
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function canUseOpenAIProvider() {
  return getAIProviderMode() !== "local" && hasOpenAIKey();
}

export function isLocalAIProviderMode() {
  return getAIProviderMode() === "local";
}
