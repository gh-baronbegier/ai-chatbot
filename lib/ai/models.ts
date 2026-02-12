export const DEFAULT_CHAT_MODEL = "claude-max-direct/claude-opus-4-6";
export const OPENAI_CODEX_CHAT_MODEL = "openai-codex-direct/gpt-5.3-codex";
export const FALLBACK_CHAT_MODEL = "openai/gpt-oss-120b";

export const MODELS = [
  { id: DEFAULT_CHAT_MODEL, label: "Claude Opus 4.6", provider: "anthropic" },
  { id: OPENAI_CODEX_CHAT_MODEL, label: "GPT-5.3 Codex", provider: "openai" },
] as const;
