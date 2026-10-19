export const PROVIDERS = ["google", "openai", "anthropic"] as const;

export type ProviderId = (typeof PROVIDERS)[number];

export const FRONTIER_SEED: Record<ProviderId, readonly string[]> = {
  google: ["gemini-4-argon", "gemini-3.8-flash"],
  openai: ["gpt-6-astra", "gpt-6.1-sol"],
  anthropic: ["claude-fable-5-1", "claude-opus-5-5"],
};

export const BALANCED_SEED: Record<ProviderId, readonly string[]> = {
  google: ["gemini-3.8-flash", "gemini-3.5-flash-lite"],
  openai: ["gpt-6.1-sol", "gpt-6-luna"],
  anthropic: ["claude-sonnet-5-5", "claude-haiku-5-5"],
};

export const NON_TEXT_ID = /image|tts|live|embed|veo|lyria|robot|transcribe|audio|imagen|music|realtime|whisper|search-preview|moderation/i;

export function providerOfId(id: string): ProviderId {
  if (id.startsWith("gpt-")) return "openai";
  if (id.startsWith("claude")) return "anthropic";
  return "google";
}
