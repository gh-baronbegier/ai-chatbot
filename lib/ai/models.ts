export const DEFAULT_CHAT_MODEL = "claude-max-direct/claude-opus-4-6";
export const OPENAI_CODEX_CHAT_MODEL = "openai-codex-direct/gpt-5.3-codex";
export const OPENAI_CODEX_52_CHAT_MODEL = "openai-codex-direct/gpt-5.2";
export const GROQ_CHAT_MODEL = "groq/openai/gpt-oss-120b";
export const GROQ_MAVERICK_CHAT_MODEL = "groq/meta-llama/llama-4-maverick-17b-128e-instruct";
export const GROQ_KIMI_CHAT_MODEL = "groq/moonshotai/kimi-k2-instruct-0905";
export const GROQ_QWEN_CHAT_MODEL = "groq/qwen/qwen3-32b";
export const XAI_CHAT_MODEL = "xai/grok-4";
export const GOOGLE_GEMINI_CHAT_MODEL = "google/gemini-3-pro-preview";

export const GROQ_MAX_COMPLETION_TOKENS: Record<string, number> = {
  [GROQ_CHAT_MODEL]: 65_536,
  [GROQ_MAVERICK_CHAT_MODEL]: 8_192,
  [GROQ_KIMI_CHAT_MODEL]: 16_384,
  [GROQ_QWEN_CHAT_MODEL]: 40_960,
};

export const MODELS = [
  { id: DEFAULT_CHAT_MODEL, label: "claude-opus-4-6", provider: "anthropic" },
  { id: OPENAI_CODEX_CHAT_MODEL, label: "gpt-5.3-codex", provider: "openai" },
  { id: OPENAI_CODEX_52_CHAT_MODEL, label: "gpt-5.2", provider: "openai" },
  { id: GOOGLE_GEMINI_CHAT_MODEL, label: "gemini-3-pro", provider: "google" },
  { id: XAI_CHAT_MODEL, label: "grok-4", provider: "xai" },
  { id: GROQ_CHAT_MODEL, label: "gpt-oss-120b", provider: "groq" },
  { id: GROQ_MAVERICK_CHAT_MODEL, label: "llama-4-maverick-17b-128e-instruct", provider: "groq" },
  { id: GROQ_KIMI_CHAT_MODEL, label: "kimi-k2-instruct-0905", provider: "groq" },
  { id: GROQ_QWEN_CHAT_MODEL, label: "qwen3-32b", provider: "groq" },
] as const;

export const PROVIDER_ENV_KEYS: Record<string, string> = {
  anthropic: "CLAUDE_MAX_REFRESH_TOKEN",
  openai: "OPENAI_CODEX_REFRESH_TOKEN",
  groq: "GROQ_API_KEY",
  xai: "XAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};
