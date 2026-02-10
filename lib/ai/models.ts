// Curated list of top models from Vercel AI Gateway
export const DEFAULT_CHAT_MODEL = "claude-max-direct/claude-opus-4-6-think-medium";

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  // =====================
  // Anthropic (13 models)
  // =====================
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", provider: "anthropic", description: "Ctx: 200K | Fast Claude 3 tier" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "anthropic", description: "Ctx: 200K | Frontier Claude 3" },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "anthropic", description: "Ctx: 200K | Faster + stronger Haiku" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "anthropic", description: "Ctx: 200K | Strong general/coding" },
  { id: "anthropic/claude-3.5-sonnet-20240620", name: "Claude 3.5 Sonnet (2024-06-20)", provider: "anthropic", description: "Ctx: 200K | Pinned snapshot" },
  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "anthropic", description: "Ctx: 200K | Hybrid reasoning Sonnet" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5", provider: "anthropic", description: "Ctx: 200K | Near-frontier at low cost" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "anthropic", description: "Ctx: 1M | Big context Sonnet" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "anthropic", description: "Ctx: 1M | Latest Sonnet series" },
  { id: "anthropic/claude-opus-4", name: "Claude Opus 4", provider: "anthropic", description: "Ctx: 200K | High-end Opus" },
  { id: "anthropic/claude-opus-4.1", name: "Claude Opus 4.1", provider: "anthropic", description: "Ctx: 200K | Precision upgrade" },
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5", provider: "anthropic", description: "Ctx: 200K | Newer Opus tier" },
  { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6", provider: "anthropic", description: "Ctx: 1M | 1M context Opus" },

  // =====================
  // OpenAI (34 models)
  // =====================
  { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", description: "Ctx: 16K | Legacy fast chat" },
  { id: "openai/gpt-3.5-turbo-instruct", name: "GPT-3.5 Turbo Instruct", provider: "openai", description: "Ctx: 8K | Legacy instruct" },
  { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", description: "Ctx: 128K | Legacy GPT-4 Turbo" },
  { id: "openai/gpt-4.1", name: "GPT-4.1", provider: "openai", description: "Ctx: 1M | Flagship GPT-4.1" },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "openai", description: "Ctx: 1M | Fast + cheap" },
  { id: "openai/gpt-4.1-nano", name: "GPT-4.1 Nano", provider: "openai", description: "Ctx: 1M | Cheapest GPT-4.1" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "openai", description: "Ctx: 128K | Multimodal generalist" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", description: "Ctx: 128K | Great speed/$" },
  { id: "openai/gpt-4o-mini-search-preview", name: "GPT-4o Mini Search Preview", provider: "openai", description: "Ctx: 128K | Search-specialized" },
  { id: "openai/gpt-5", name: "GPT-5", provider: "openai", description: "Ctx: 400K | Flagship GPT-5 family" },
  { id: "openai/gpt-5-chat", name: "GPT-5 Chat", provider: "openai", description: "Ctx: 128K | ChatGPT snapshot" },
  { id: "openai/gpt-5-codex", name: "GPT-5 Codex", provider: "openai", description: "Ctx: 400K | Agentic coding-tuned" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "openai", description: "Ctx: 400K | Strong value reasoning" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano", provider: "openai", description: "Ctx: 400K | High-throughput basic tasks" },
  { id: "openai/gpt-5-pro", name: "GPT-5 Pro", provider: "openai", description: "Ctx: 400K | Extra compute / slow-think tier" },
  { id: "openai/gpt-5.1-instant", name: "GPT-5.1 Instant", provider: "openai", description: "Ctx: 128K | Conversational + adaptive thinking" },
  { id: "openai/gpt-5.1-thinking", name: "GPT-5.1 Thinking", provider: "openai", description: "Ctx: 400K | More deliberate reasoning" },
  { id: "openai/gpt-5.1-codex", name: "GPT-5.1 Codex", provider: "openai", description: "Ctx: 400K | Coding-optimized" },
  { id: "openai/gpt-5.1-codex-max", name: "GPT-5.1 Codex Max", provider: "openai", description: "Ctx: 400K | Max coding agent variant" },
  { id: "openai/gpt-5.1-codex-mini", name: "GPT-5.1 Codex Mini", provider: "openai", description: "Ctx: 400K | Cheaper coding variant" },
  { id: "openai/gpt-5.2", name: "GPT-5.2", provider: "openai", description: "Ctx: 400K | Best general-purpose OpenAI" },
  { id: "openai/gpt-5.2-chat", name: "GPT-5.2 Chat", provider: "openai", description: "Ctx: 128K | ChatGPT pointer" },
  { id: "openai/gpt-5.2-codex", name: "GPT-5.2 Codex", provider: "openai", description: "Ctx: 400K | Stronger long-horizon coding" },
  { id: "openai/gpt-5.2-pro", name: "GPT-5.2 Pro", provider: "openai", description: "Ctx: 400K | Highest-cost precision tier" },
  { id: "openai/o1", name: "o1", provider: "openai", description: "Ctx: 200K | Flagship reasoning" },
  { id: "openai/o3", name: "o3", provider: "openai", description: "Ctx: 200K | Powerful reasoning at lower cost" },
  { id: "openai/o3-mini", name: "o3-mini", provider: "openai", description: "Ctx: 200K | Small reasoning workhorse" },
  { id: "openai/o3-pro", name: "o3-pro", provider: "openai", description: "Ctx: 200K | Extra compute reasoning" },
  { id: "openai/o3-deep-research", name: "o3-deep-research", provider: "openai", description: "Ctx: 200K | Deep research + web search" },
  { id: "openai/o4-mini", name: "o4-mini", provider: "openai", description: "Ctx: 200K | Fast, cost-efficient reasoning" },
  { id: "openai/codex-mini", name: "Codex Mini", provider: "openai", description: "Ctx: 200K | Codex CLI-tuned" },
  { id: "openai/gpt-oss-20b", name: "gpt-oss-20b", provider: "openai", description: "Ctx: 128K | Open-weight, low-latency" },
  { id: "openai/gpt-oss-120b", name: "gpt-oss-120b", provider: "openai", description: "Ctx: 131K | Open-weight, high capability" },
  { id: "openai/gpt-oss-safeguard-20b", name: "gpt-oss-safeguard-20b", provider: "openai", description: "Ctx: 131K | Safety classification specialist" },

  // =====================
  // Google (12 models)
  // =====================
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", description: "Ctx: 1M | Fast 1M context" },
  { id: "google/gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", provider: "google", description: "Ctx: 1M | Cheapest 1M context" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", description: "Ctx: 1M | Strong balanced thinking" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", provider: "google", description: "Ctx: 1M | Ultra fast + cheap" },
  { id: "google/gemini-2.5-flash-lite-preview-09-2025", name: "Gemini 2.5 Flash Lite Preview (09-2025)", provider: "google", description: "Ctx: 1M | Preview snapshot" },
  { id: "google/gemini-2.5-flash-preview-09-2025", name: "Gemini 2.5 Flash Preview (09-2025)", provider: "google", description: "Ctx: 1M | Preview snapshot" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", description: "Ctx: 1M | Strongest Gemini 2.x reasoning" },
  { id: "google/gemini-3-flash", name: "Gemini 3 Flash", provider: "google", description: "Ctx: 1M | Fast frontier-ish" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview", provider: "google", description: "Ctx: 1M | Hard tasks + agentic workflows" },
  { id: "google/gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image", provider: "google", description: "Ctx: 32K | Text + image generation" },
  { id: "google/gemini-2.5-flash-image-preview", name: "Gemini 2.5 Flash Image Preview", provider: "google", description: "Ctx: 32K | Preview image-capable" },
  { id: "google/gemini-3-pro-image", name: "Gemini 3 Pro Image", provider: "google", description: "Ctx: 64K | Higher-end image gen" },

  // =====================
  // xAI (11 models)
  // =====================
  { id: "xai/grok-2-vision", name: "Grok 2 Vision", provider: "xai", description: "Ctx: 32K | Vision-focused" },
  { id: "xai/grok-3", name: "Grok 3", provider: "xai", description: "Ctx: 131K | Flagship beta" },
  { id: "xai/grok-3-fast", name: "Grok 3 Fast", provider: "xai", description: "Ctx: 131K | Faster infra" },
  { id: "xai/grok-3-mini", name: "Grok 3 Mini", provider: "xai", description: "Ctx: 131K | Thinks before responding" },
  { id: "xai/grok-3-mini-fast", name: "Grok 3 Mini Fast", provider: "xai", description: "Ctx: 131K | Faster mini thinking" },
  { id: "xai/grok-4", name: "Grok 4", provider: "xai", description: "Ctx: 256K | Latest flagship" },
  { id: "xai/grok-4-fast-non-reasoning", name: "Grok 4 Fast (Non-Reasoning)", provider: "xai", description: "Ctx: 2M | Speed-first, no reasoning" },
  { id: "xai/grok-4-fast-reasoning", name: "Grok 4 Fast (Reasoning)", provider: "xai", description: "Ctx: 2M | 2M ctx + reasoning" },
  { id: "xai/grok-4.1-fast-non-reasoning", name: "Grok 4.1 Fast (Non-Reasoning)", provider: "xai", description: "Ctx: 2M | 2M ctx tool-calling" },
  { id: "xai/grok-4.1-fast-reasoning", name: "Grok 4.1 Fast (Reasoning)", provider: "xai", description: "Ctx: 2M | 2M ctx reasoning" },
  { id: "xai/grok-code-fast-1", name: "Grok Code Fast 1", provider: "xai", description: "Ctx: 256K | Coding model" },

  // =====================
  // DeepSeek (7 models)
  // =====================
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "deepseek", description: "Ctx: 160K | Reasoning model" },
  { id: "deepseek/deepseek-v3", name: "DeepSeek V3", provider: "deepseek", description: "Ctx: 164K | Fast general-purpose" },
  { id: "deepseek/deepseek-v3.1", name: "DeepSeek V3.1", provider: "deepseek", description: "Ctx: 164K | Long-context upgrade" },
  { id: "deepseek/deepseek-v3.1-terminus", name: "DeepSeek V3.1 Terminus", provider: "deepseek", description: "Ctx: 131K | Stability/agent upgrades" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2", provider: "deepseek", description: "Ctx: 164K | Successor to V3.2-Exp" },
  { id: "deepseek/deepseek-v3.2-exp", name: "DeepSeek V3.2 Exp", provider: "deepseek", description: "Ctx: 164K | Experimental sparse attention" },
  { id: "deepseek/deepseek-v3.2-thinking", name: "DeepSeek V3.2 Thinking", provider: "deepseek", description: "Ctx: 128K | Thinking mode variant" },

  // =====================
  // Meta (9 models)
  // =====================
  { id: "meta/llama-3.1-8b", name: "Llama 3.1 8B Instruct", provider: "meta", description: "Ctx: 131K | Lightweight instruct" },
  { id: "meta/llama-3.1-70b", name: "Llama 3.1 70B Instruct", provider: "meta", description: "Ctx: 131K | Strong open-weight chat" },
  { id: "meta/llama-3.2-1b", name: "Llama 3.2 1B Instruct", provider: "meta", description: "Ctx: 128K | Tiny model" },
  { id: "meta/llama-3.2-3b", name: "Llama 3.2 3B Instruct", provider: "meta", description: "Ctx: 128K | Small instruct" },
  { id: "meta/llama-3.2-11b", name: "Llama 3.2 11B Vision Instruct", provider: "meta", description: "Ctx: 128K | Vision instruct" },
  { id: "meta/llama-3.2-90b", name: "Llama 3.2 90B Vision Instruct", provider: "meta", description: "Ctx: 128K | Large vision instruct" },
  { id: "meta/llama-3.3-70b", name: "Llama 3.3 70B Instruct", provider: "meta", description: "Ctx: 128K | Efficiency-focused" },
  { id: "meta/llama-4-maverick", name: "Llama 4 Maverick 17B Instruct", provider: "meta", description: "Ctx: 131K | Multimodal MoE" },
  { id: "meta/llama-4-scout", name: "Llama 4 Scout 17B Instruct", provider: "meta", description: "Ctx: 131K | Multimodal MoE (lighter)" },

  // =====================
  // Mistral (16 models)
  // =====================
  { id: "mistral/codestral", name: "Codestral", provider: "mistral", description: "Ctx: 128K | Coding specialist" },
  { id: "mistral/devstral-2", name: "Devstral 2", provider: "mistral", description: "Ctx: 256K | Dev agent" },
  { id: "mistral/devstral-small", name: "Devstral Small 1.1", provider: "mistral", description: "Ctx: 128K | Agentic coding assistant" },
  { id: "mistral/devstral-small-2", name: "Devstral Small 2", provider: "mistral", description: "Ctx: 256K | Dev agent (small)" },
  { id: "mistral/magistral-small", name: "Magistral Small 2509", provider: "mistral", description: "Ctx: 128K | Transparent reasoning" },
  { id: "mistral/magistral-medium", name: "Magistral Medium 2509", provider: "mistral", description: "Ctx: 128K | Stronger reasoning" },
  { id: "mistral/ministral-3b", name: "Ministral 3B", provider: "mistral", description: "Ctx: 128K | Tiny + efficient" },
  { id: "mistral/ministral-8b", name: "Ministral 8B", provider: "mistral", description: "Ctx: 128K | Stronger small model" },
  { id: "mistral/ministral-14b", name: "Ministral 14B", provider: "mistral", description: "Ctx: 256K | Larger Ministral family" },
  { id: "mistral/mistral-small", name: "Mistral Small", provider: "mistral", description: "Ctx: 32K | Bulk tasks" },
  { id: "mistral/mistral-nemo", name: "Mistral Nemo 12B", provider: "mistral", description: "Ctx: 131K | Strong 12B" },
  { id: "mistral/mistral-medium", name: "Mistral Medium 3.1", provider: "mistral", description: "Ctx: 128K | Mid-tier generalist" },
  { id: "mistral/mistral-large-3", name: "Mistral Large 3", provider: "mistral", description: "Ctx: 256K | Top Mistral family" },
  { id: "mistral/mixtral-8x22b-instruct", name: "Mixtral 8x22B Instruct", provider: "mistral", description: "Ctx: 64K | MoE instruct" },
  { id: "mistral/pixtral-12b", name: "Pixtral 12B", provider: "mistral", description: "Ctx: 128K | Multimodal 12B" },
  { id: "mistral/pixtral-large", name: "Pixtral Large", provider: "mistral", description: "Ctx: 128K | Strong multimodal" },

  // =====================
  // Venice AI (13 models — custom provider, uncensored)
  // =====================
  { id: "venice/llama-3.3-70b", name: "Llama 3.3 70B", provider: "venice", description: "Uncensored Llama via Venice AI" },
  { id: "venice/deepseek-r1-671b", name: "DeepSeek R1 671B", provider: "venice", description: "Full DeepSeek R1 via Venice AI" },
  { id: "venice/qwen-2.5-coder", name: "Qwen 2.5 Coder", provider: "venice", description: "Code-specialized model via Venice AI" },
  { id: "venice/venice-uncensored", name: "Venice Uncensored 1.1", provider: "venice", description: "Ctx: 32K | Uncensored via Venice AI" },
  { id: "venice/zai-org-glm-4.7-flash", name: "GLM 4.7 Flash", provider: "venice", description: "Ctx: 128K | Fast GLM via Venice AI" },
  { id: "venice/zai-org-glm-4.7", name: "GLM 4.7", provider: "venice", description: "Ctx: 198K | Full GLM via Venice AI" },
  { id: "venice/qwen3-4b", name: "Venice Small (Qwen 3 4B)", provider: "venice", description: "Ctx: 32K | Cheapest via Venice AI" },
  { id: "venice/mistral-31-24b", name: "Venice Medium (Mistral 24B)", provider: "venice", description: "Ctx: 128K | Mid-tier via Venice AI" },
  { id: "venice/qwen3-235b-a22b-thinking-2507", name: "Qwen 3 235B Thinking", provider: "venice", description: "Ctx: 128K | Reasoning MoE via Venice AI" },
  { id: "venice/qwen3-235b-a22b-instruct-2507", name: "Qwen 3 235B Instruct", provider: "venice", description: "Ctx: 128K | MoE instruct via Venice AI" },
  { id: "venice/qwen3-next-80b", name: "Qwen 3 Next 80B", provider: "venice", description: "Ctx: 256K | Strong open-weight via Venice AI" },
  { id: "venice/qwen3-coder-480b-a35b-instruct", name: "Qwen 3 Coder 480B", provider: "venice", description: "Ctx: 256K | Coding MoE via Venice AI" },
  { id: "venice/hermes-3-llama-3.1-405b", name: "Hermes 3 Llama 3.1 405B", provider: "venice", description: "Ctx: 128K | Large uncensored via Venice AI" },

  // =====================
  // Groq (7 models — ultra-fast inference)
  // =====================
  // GPT-OSS (OpenAI open-weight models)
  { id: "groq/openai/gpt-oss-120b", name: "GPT-OSS 120B (Groq)", provider: "groq", description: "Ctx: 131K | Open-weight flagship via Groq" },
  { id: "groq/openai/gpt-oss-20b", name: "GPT-OSS 20B (Groq)", provider: "groq", description: "Ctx: 131K | Open-weight low-latency via Groq" },
  // Other Groq-hosted models
  { id: "groq/llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile (Groq)", provider: "groq", description: "Ctx: 131K | Fast Llama 3.3 via Groq" },
  { id: "groq/llama-3.1-8b-instant", name: "Llama 3.1 8B Instant (Groq)", provider: "groq", description: "Ctx: 131K | Ultra-fast small model via Groq" },
  { id: "groq/meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick (Groq)", provider: "groq", description: "Ctx: 131K | Multimodal MoE via Groq" },
  { id: "groq/meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout (Groq)", provider: "groq", description: "Ctx: 131K | Multimodal MoE lighter via Groq" },
  { id: "groq/qwen/qwen3-32b", name: "Qwen 3 32B (Groq)", provider: "groq", description: "Ctx: 131K | Reasoning-capable via Groq" },

  // =====================
  // Anthropic Direct (5 models — direct API, no gateway)
  // =====================
  { id: "anthropic-direct/claude-opus-4-5", name: "Claude Opus 4.5 (Direct)", provider: "anthropic-direct", description: "Ctx: 200K | Direct Anthropic API" },
  { id: "anthropic-direct/claude-sonnet-4-5", name: "Claude Sonnet 4.5 (Direct)", provider: "anthropic-direct", description: "Ctx: 1M | Direct Anthropic API" },
  { id: "anthropic-direct/claude-sonnet-4-0", name: "Claude Sonnet 4 (Direct)", provider: "anthropic-direct", description: "Ctx: 1M | Direct Anthropic API" },
  { id: "anthropic-direct/claude-haiku-4-5", name: "Claude Haiku 4.5 (Direct)", provider: "anthropic-direct", description: "Ctx: 200K | Direct Anthropic API" },
  { id: "anthropic-direct/claude-opus-4-6", name: "Claude Opus 4.6 (Direct)", provider: "anthropic-direct", description: "Ctx: 1M | No thinking" },
  { id: "anthropic-direct/claude-opus-4-6-think-low", name: "Claude Opus 4.6 Think Low (Direct)", provider: "anthropic-direct", description: "Ctx: 1M | 10K thinking budget" },
  { id: "anthropic-direct/claude-opus-4-6-think-medium", name: "Claude Opus 4.6 Think Med (Direct)", provider: "anthropic-direct", description: "Ctx: 1M | 32K thinking budget" },
  { id: "anthropic-direct/claude-opus-4-6-think-high", name: "Claude Opus 4.6 Think High (Direct)", provider: "anthropic-direct", description: "Ctx: 1M | 128K thinking budget" },

  // =====================
  // OpenAI Direct (5 models — direct API, no gateway)
  // =====================
  { id: "openai-direct/gpt-5.2", name: "GPT-5.2 (Direct)", provider: "openai-direct", description: "Ctx: 400K | Direct OpenAI API" },
  { id: "openai-direct/gpt-5.2-pro", name: "GPT-5.2 Pro (Direct)", provider: "openai-direct", description: "Ctx: 400K | Direct OpenAI API" },
  { id: "openai-direct/gpt-4.1", name: "GPT-4.1 (Direct)", provider: "openai-direct", description: "Ctx: 1M | Direct OpenAI API" },
  { id: "openai-direct/o3", name: "o3 (Direct)", provider: "openai-direct", description: "Ctx: 200K | Direct OpenAI API" },
  { id: "openai-direct/o4-mini", name: "o4-mini (Direct)", provider: "openai-direct", description: "Ctx: 200K | Direct OpenAI API" },

  // =====================
  // xAI Direct (3 models — direct API, no gateway)
  // =====================
  { id: "xai-direct/grok-4", name: "Grok 4 (Direct)", provider: "xai-direct", description: "Ctx: 256K | Direct xAI API" },
  { id: "xai-direct/grok-4-fast-non-reasoning", name: "Grok 4 Fast (Direct)", provider: "xai-direct", description: "Ctx: 2M | Direct xAI API" },
  { id: "xai-direct/grok-3", name: "Grok 3 (Direct)", provider: "xai-direct", description: "Ctx: 131K | Direct xAI API" },

  // =====================
  // Google Direct (4 models — direct API via AI Studio, no gateway)
  // =====================
  { id: "google-direct/gemini-2.5-pro", name: "Gemini 2.5 Pro (Direct)", provider: "google-direct", description: "Ctx: 1M | Direct Google AI Studio" },
  { id: "google-direct/gemini-2.5-flash", name: "Gemini 2.5 Flash (Direct)", provider: "google-direct", description: "Ctx: 1M | Direct Google AI Studio" },
  { id: "google-direct/gemini-3-flash", name: "Gemini 3 Flash (Direct)", provider: "google-direct", description: "Ctx: 1M | Direct Google AI Studio" },
  { id: "google-direct/gemini-3-pro-preview", name: "Gemini 3 Pro Preview (Direct)", provider: "google-direct", description: "Ctx: 1M | Direct Google AI Studio" },

  // =====================
  // Claude MAX (via anthropic-max-router — flat-rate, full tool support)
  // =====================
  { id: "claude-max/claude-opus-4-6", name: "Claude Opus 4.6 (MAX)", provider: "claude-max", description: "Ctx: 1M | MAX flat-rate + tools" },
  { id: "claude-max/claude-opus-4-6-think-low", name: "Opus 4.6 Think Low (MAX)", provider: "claude-max", description: "Ctx: 1M | 10K thinking budget" },
  { id: "claude-max/claude-opus-4-6-think-medium", name: "Opus 4.6 Think Med (MAX)", provider: "claude-max", description: "Ctx: 1M | 32K thinking budget" },
  { id: "claude-max/claude-opus-4-6-think-high", name: "Opus 4.6 Think High (MAX)", provider: "claude-max", description: "Ctx: 1M | 128K thinking budget" },
  { id: "claude-max/claude-opus-4-5", name: "Claude Opus 4.5 (MAX)", provider: "claude-max", description: "Ctx: 200K | MAX flat-rate + tools" },
  { id: "claude-max/claude-sonnet-4-5", name: "Claude Sonnet 4.5 (MAX)", provider: "claude-max", description: "Ctx: 1M | MAX flat-rate + tools" },
  { id: "claude-max/claude-sonnet-4-5-think-low", name: "Sonnet 4.5 Think Low (MAX)", provider: "claude-max", description: "Ctx: 1M | 10K thinking budget" },
  { id: "claude-max/claude-sonnet-4-5-think-medium", name: "Sonnet 4.5 Think Med (MAX)", provider: "claude-max", description: "Ctx: 1M | 32K thinking budget" },
  { id: "claude-max/claude-sonnet-4-5-think-high", name: "Sonnet 4.5 Think High (MAX)", provider: "claude-max", description: "Ctx: 1M | 128K thinking budget" },
  { id: "claude-max/claude-sonnet-4-0", name: "Claude Sonnet 4 (MAX)", provider: "claude-max", description: "Ctx: 1M | MAX flat-rate + tools" },
  { id: "claude-max/claude-haiku-4-5", name: "Claude Haiku 4.5 (MAX)", provider: "claude-max", description: "Ctx: 200K | MAX flat-rate + tools" },

  // =====================
  // Claude MAX Direct (inline OAuth — no proxy, flat-rate, full tool support)
  // =====================
  { id: "claude-max-direct/claude-opus-4-6", name: "Claude Opus 4.6 (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 1M | MAX OAuth, no proxy" },
  { id: "claude-max-direct/claude-opus-4-6-think-low", name: "Opus 4.6 Think Low (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 1M | 10K thinking budget" },
  { id: "claude-max-direct/claude-opus-4-6-think-medium", name: "Opus 4.6 Think Med (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 1M | 32K thinking budget" },
  { id: "claude-max-direct/claude-opus-4-6-think-high", name: "Opus 4.6 Think High (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 1M | 128K thinking budget" },
  { id: "claude-max-direct/claude-opus-4-5", name: "Claude Opus 4.5 (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 200K | MAX OAuth, no proxy" },
  { id: "claude-max-direct/claude-sonnet-4-5", name: "Claude Sonnet 4.5 (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 1M | MAX OAuth, no proxy" },
  { id: "claude-max-direct/claude-sonnet-4-5-think-low", name: "Sonnet 4.5 Think Low (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 1M | 10K thinking budget" },
  { id: "claude-max-direct/claude-sonnet-4-5-think-medium", name: "Sonnet 4.5 Think Med (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 1M | 32K thinking budget" },
  { id: "claude-max-direct/claude-sonnet-4-5-think-high", name: "Sonnet 4.5 Think High (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 1M | 128K thinking budget" },
  { id: "claude-max-direct/claude-sonnet-4-0", name: "Claude Sonnet 4 (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 1M | MAX OAuth, no proxy" },
  { id: "claude-max-direct/claude-haiku-4-5", name: "Claude Haiku 4.5 (MAX Direct)", provider: "claude-max-direct", description: "Ctx: 200K | MAX OAuth, no proxy" },
];

// Group models by provider for UI
export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
