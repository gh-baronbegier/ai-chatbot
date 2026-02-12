import type { TextStreamPart, GenerateTextResult } from "ai";
import { getFallbackModel } from "./providers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpenAIChatMessage {
  role: "system" | "developer" | "user" | "assistant" | "tool";
  content?: string | Array<Record<string, unknown>> | null;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface OpenAIChatRequest {
  model?: string;
  messages: OpenAIChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stop?: string | string[];
  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  tool_choice?: "none" | "auto" | "required" | { type: "function"; function: { name: string } };
  n?: number;
}

export interface OpenAIChoice {
  index: number;
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }>;
  };
  finish_reason: "stop" | "tool_calls" | "length" | "content_filter" | null;
}

export interface OpenAIChatResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIStreamChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Record<string, unknown>;
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
}

export interface OpenAIModelEntry {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
}

// ---------------------------------------------------------------------------
// Model mapping
// ---------------------------------------------------------------------------

const MODEL_ALIASES: Record<string, string> = {
  "claude-opus-4-6": "claude-max-direct/claude-opus-4-6",
  "claude-opus": "claude-max-direct/claude-opus-4-6",
  "claude-sonnet-4-5": "claude-max-direct/claude-sonnet-4-5",
  "claude-sonnet": "claude-max-direct/claude-sonnet-4-5",
  "claude-haiku-4-5": "claude-max-direct/claude-haiku-4-5",
  "claude-haiku": "claude-max-direct/claude-haiku-4-5",
  "gpt-5.3-codex": "openai-codex-direct/gpt-5.3-codex",
  codex: "openai-codex-direct/gpt-5.3-codex",
};

export function resolveOpenAICompatModel(model?: string): {
  publicModel: string;
  internalModelId: string;
  useFallback: boolean;
} {
  if (!model) {
    return {
      publicModel: "claude-opus-4-6",
      internalModelId: "claude-max-direct/claude-opus-4-6",
      useFallback: false,
    };
  }

  if (model === "groq-fallback") {
    return {
      publicModel: "groq-fallback",
      internalModelId: "__fallback__",
      useFallback: true,
    };
  }

  // Accept raw internal IDs (e.g. "claude-max-direct/claude-haiku-4-5")
  if (model.includes("/")) {
    return {
      publicModel: model,
      internalModelId: model,
      useFallback: false,
    };
  }

  const mapped = MODEL_ALIASES[model];
  if (mapped) {
    return {
      publicModel: model,
      internalModelId: mapped,
      useFallback: false,
    };
  }

  // Unknown alias — default to opus
  return {
    publicModel: model,
    internalModelId: "claude-max-direct/claude-opus-4-6",
    useFallback: false,
  };
}

/** All models we expose via /v1/models */
export const AVAILABLE_MODELS: OpenAIModelEntry[] = [
  { id: "claude-opus-4-6", object: "model", created: 1700000000, owned_by: "anthropic" },
  { id: "claude-opus", object: "model", created: 1700000000, owned_by: "anthropic" },
  { id: "claude-sonnet-4-5", object: "model", created: 1700000000, owned_by: "anthropic" },
  { id: "claude-sonnet", object: "model", created: 1700000000, owned_by: "anthropic" },
  { id: "claude-haiku-4-5", object: "model", created: 1700000000, owned_by: "anthropic" },
  { id: "claude-haiku", object: "model", created: 1700000000, owned_by: "anthropic" },
  { id: "gpt-5.3-codex", object: "model", created: 1700000000, owned_by: "openai" },
  { id: "codex", object: "model", created: 1700000000, owned_by: "openai" },
  { id: "groq-fallback", object: "model", created: 1700000000, owned_by: "groq" },
];

// ---------------------------------------------------------------------------
// Message conversion: OpenAI → AI SDK ModelMessage[]
// ---------------------------------------------------------------------------

interface AISDKMessage {
  role: "user" | "assistant" | "tool";
  content: string | Array<Record<string, unknown>>;
}

export function convertOpenAIMessagesToAISDK(messages: OpenAIChatMessage[]): {
  system: string;
  modelMessages: AISDKMessage[];
} {
  const systemParts: string[] = [];
  const modelMessages: AISDKMessage[] = [];

  // Track tool_call_id → toolName for tool result messages
  const toolCallIdToName = new Map<string, string>();

  for (const msg of messages) {
    if (msg.role === "system" || msg.role === "developer") {
      if (typeof msg.content === "string") {
        systemParts.push(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "text" && typeof part.text === "string") {
            systemParts.push(part.text);
          }
        }
      }
      continue;
    }

    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        modelMessages.push({ role: "user", content: msg.content });
      } else if (Array.isArray(msg.content)) {
        // Multimodal content parts
        const parts: Array<Record<string, unknown>> = [];
        for (const part of msg.content) {
          if (part.type === "text") {
            parts.push({ type: "text", text: part.text });
          } else if (part.type === "image_url") {
            const imageUrl = (part.image_url as Record<string, unknown>)?.url;
            if (typeof imageUrl === "string") {
              parts.push({ type: "image", image: imageUrl });
            }
          }
        }
        modelMessages.push({ role: "user", content: parts });
      }
      continue;
    }

    if (msg.role === "assistant") {
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        const parts: Array<Record<string, unknown>> = [];
        // Add text content if present
        if (typeof msg.content === "string" && msg.content.length > 0) {
          parts.push({ type: "text", text: msg.content });
        }
        for (const tc of msg.tool_calls) {
          toolCallIdToName.set(tc.id, tc.function.name);
          let parsedArgs: unknown;
          try {
            parsedArgs = JSON.parse(tc.function.arguments);
          } catch {
            parsedArgs = tc.function.arguments;
          }
          parts.push({
            type: "tool-call",
            toolCallId: tc.id,
            toolName: tc.function.name,
            input: parsedArgs,
          });
        }
        modelMessages.push({ role: "assistant", content: parts });
      } else {
        modelMessages.push({
          role: "assistant",
          content: typeof msg.content === "string" ? msg.content : "",
        });
      }
      continue;
    }

    if (msg.role === "tool") {
      const toolName = msg.tool_call_id
        ? toolCallIdToName.get(msg.tool_call_id) ?? "unknown"
        : "unknown";
      const resultStr = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      modelMessages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: msg.tool_call_id ?? "unknown",
            toolName,
            output: { type: "text", value: resultStr },
          },
        ],
      });
      continue;
    }
  }

  return {
    system: systemParts.join("\n\n"),
    modelMessages,
  };
}

// ---------------------------------------------------------------------------
// Stream transformer: AI SDK v6 fullStream → SSE OpenAI chunks
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

function sseChunk(data: string): Uint8Array {
  return encoder.encode(`data: ${data}\n\n`);
}

function generateCompletionId(): string {
  return `chatcmpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createOpenAIStreamTransformer(opts: {
  model: string;
}): TransformStream<TextStreamPart<Record<string, unknown>>, Uint8Array> {
  const completionId = generateCompletionId();
  const created = Math.floor(Date.now() / 1000);
  let sentRole = false;
  let sentDone = false;
  let hasToolCalls = false;
  let hasTextAfterTools = false;

  // Track tool call index by id
  const toolCallIndices = new Map<string, number>();
  let nextToolIndex = 0;

  function makeChunk(
    delta: Record<string, unknown>,
    finishReason: string | null = null,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null,
  ): string {
    const chunk: OpenAIStreamChunk = {
      id: completionId,
      object: "chat.completion.chunk",
      created,
      model: opts.model,
      choices: [{ index: 0, delta, finish_reason: finishReason }],
    };
    if (usage) {
      chunk.usage = usage;
    }
    return JSON.stringify(chunk);
  }

  return new TransformStream({
    transform(part, controller) {
      // Emit role on first chunk
      if (!sentRole) {
        sentRole = true;
        controller.enqueue(sseChunk(makeChunk({ role: "assistant" })));
      }

      switch (part.type) {
        case "text-delta": {
          // AI SDK v6 fullStream: { type: "text-delta", text: string }
          const p = part as unknown as { text: string };
          if (p.text) {
            if (hasToolCalls) hasTextAfterTools = true;
            controller.enqueue(sseChunk(makeChunk({ content: p.text })));
          }
          break;
        }

        case "reasoning-delta": {
          // Skip reasoning — clients don't expect this in OpenAI format
          break;
        }

        case "tool-input-start": {
          // AI SDK v6 fullStream: { type: "tool-input-start", id: string, toolName: string }
          hasToolCalls = true;
          const p = part as unknown as { id: string; toolName: string };
          const idx = nextToolIndex++;
          toolCallIndices.set(p.id, idx);
          controller.enqueue(
            sseChunk(
              makeChunk({
                tool_calls: [
                  {
                    index: idx,
                    id: p.id,
                    type: "function",
                    function: { name: p.toolName, arguments: "" },
                  },
                ],
              })
            )
          );
          break;
        }

        case "tool-input-delta": {
          // AI SDK v6 fullStream: { type: "tool-input-delta", id: string, delta: string }
          const p = part as unknown as { id: string; delta: string };
          const idx = toolCallIndices.get(p.id) ?? 0;
          controller.enqueue(
            sseChunk(
              makeChunk({
                tool_calls: [
                  {
                    index: idx,
                    function: { arguments: p.delta },
                  },
                ],
              })
            )
          );
          break;
        }

        case "tool-call": {
          // Complete tool call — if we haven't been streaming it, emit the full call
          hasToolCalls = true;
          const p = part as unknown as {
            toolCallId: string;
            toolName: string;
            input: unknown;
            args: unknown;
          };
          const toolArgs = p.input ?? p.args;
          if (!toolCallIndices.has(p.toolCallId)) {
            const idx = nextToolIndex++;
            toolCallIndices.set(p.toolCallId, idx);
            controller.enqueue(
              sseChunk(
                makeChunk({
                  tool_calls: [
                    {
                      index: idx,
                      id: p.toolCallId,
                      type: "function",
                      function: {
                        name: p.toolName,
                        arguments: typeof toolArgs === "string" ? toolArgs : JSON.stringify(toolArgs ?? {}),
                      },
                    },
                  ],
                })
              )
            );
          }
          break;
        }

        case "tool-result": {
          // Server-side tool results — we skip these in the stream since
          // the model will continue and produce text output or more tool calls
          break;
        }

        case "step-finish": {
          // Intermediate step finish — ignore, wait for the final finish
          break;
        }

        case "finish": {
          // AI SDK v6 fullStream: { type: "finish", finishReason, totalUsage: { inputTokens, outputTokens } }
          const p = part as unknown as {
            finishReason?: string;
            totalUsage?: { inputTokens?: number; outputTokens?: number };
          };
          // If server tools ran but the model continued with text output,
          // use the model's own finish reason (typically "stop"), not "tool_calls"
          const finishReason = (hasToolCalls && !hasTextAfterTools)
            ? "tool_calls"
            : mapFinishReason(p.finishReason ?? "stop");
          const usage = p.totalUsage
            ? {
                prompt_tokens: p.totalUsage.inputTokens ?? 0,
                completion_tokens: p.totalUsage.outputTokens ?? 0,
                total_tokens: (p.totalUsage.inputTokens ?? 0) + (p.totalUsage.outputTokens ?? 0),
              }
            : null;
          controller.enqueue(sseChunk(makeChunk({}, finishReason, usage)));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          sentDone = true;
          break;
        }

        case "error": {
          const p = part as unknown as { error: unknown };
          const errMsg =
            p.error instanceof Error ? p.error.message : String(p.error);
          controller.enqueue(
            sseChunk(
              JSON.stringify({
                error: {
                  message: errMsg,
                  type: "server_error",
                  code: "internal_error",
                },
              })
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          sentDone = true;
          break;
        }

        default:
          // Ignore unknown part types (source, etc.)
          break;
      }
    },

    flush(controller) {
      if (!sentDone) {
        if (!sentRole) {
          controller.enqueue(sseChunk(makeChunk({ role: "assistant" })));
        }
        const finishReason = (hasToolCalls && !hasTextAfterTools) ? "tool_calls" : "stop";
        controller.enqueue(sseChunk(makeChunk({}, finishReason)));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      }
    },
  });
}

function mapFinishReason(reason: string): string {
  switch (reason) {
    case "stop":
    case "end-turn":
      return "stop";
    case "tool-calls":
      return "tool_calls";
    case "length":
    case "max-tokens":
      return "length";
    case "content-filter":
      return "content_filter";
    default:
      return "stop";
  }
}

// ---------------------------------------------------------------------------
// Non-streaming response converter
// ---------------------------------------------------------------------------

export function convertAISDKResponseToOpenAI(
  result: GenerateTextResult<Record<string, unknown>, never>,
  model: string,
): OpenAIChatResponse {
  const completionId = generateCompletionId();
  const created = Math.floor(Date.now() / 1000);

  const hasToolCalls = result.toolCalls && result.toolCalls.length > 0;

  const message: OpenAIChoice["message"] = {
    role: "assistant",
    content: result.text || null,
  };

  if (hasToolCalls) {
    message.tool_calls = result.toolCalls.map((tc) => {
      // AI SDK v6 uses .input, older versions used .args
      const args = (tc as any).input ?? (tc as any).args;
      return {
        id: tc.toolCallId,
        type: "function" as const,
        function: {
          name: tc.toolName,
          arguments: typeof args === "string" ? args : JSON.stringify(args ?? {}),
        },
      };
    });
  }

  const finishReason = hasToolCalls
    ? "tool_calls"
    : mapFinishReason(result.finishReason ?? "stop");

  const response: OpenAIChatResponse = {
    id: completionId,
    object: "chat.completion",
    created,
    model,
    choices: [
      {
        index: 0,
        message,
        finish_reason: finishReason as OpenAIChoice["finish_reason"],
      },
    ],
  };

  // AI SDK v6 generateText: result.totalUsage has { inputTokens, outputTokens }
  const usage = (result as any).totalUsage ?? (result as any).usage;
  if (usage) {
    const input = usage.inputTokens ?? usage.promptTokens ?? 0;
    const output = usage.outputTokens ?? usage.completionTokens ?? 0;
    response.usage = {
      prompt_tokens: input,
      completion_tokens: output,
      total_tokens: input + output,
    };
  }

  return response;
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

export function openAIErrorResponse(
  status: number,
  message: string,
  type: string = "invalid_request_error",
  code?: string,
): Response {
  return Response.json(
    {
      error: {
        message,
        type,
        code: code ?? null,
        param: null,
      },
    },
    {
      status,
      headers: corsHeaders(),
    },
  );
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

export function getBearerToken(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (!auth) return null;
  const parts = auth.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

/**
 * Auth is fully open — all requests are accepted regardless of token.
 */
export function validateAuth(_headers: Headers): { valid: boolean; error?: Response } {
  return { valid: true };
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ---------------------------------------------------------------------------
// tool_choice mapping
// ---------------------------------------------------------------------------

export function mapToolChoice(
  choice: OpenAIChatRequest["tool_choice"],
): "auto" | "none" | "required" | { type: "tool"; toolName: string } | undefined {
  if (!choice) return undefined;
  if (choice === "none") return "none";
  if (choice === "auto") return "auto";
  if (choice === "required") return "required";
  if (typeof choice === "object" && choice.type === "function" && choice.function?.name) {
    return { type: "tool", toolName: choice.function.name };
  }
  return undefined;
}
