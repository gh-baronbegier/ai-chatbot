# Task: Build an OpenAI-Compatible API Layer for My Next.js AI Chatbot

I have a Next.js AI chatbot that currently uses the Vercel AI SDK (`ai@6.0.78`) with custom providers (Claude MAX via Anthropic OAuth, OpenAI Codex via ChatGPT backend, Groq as fallback). I want to add an **OpenAI-compatible API** (`/v1/chat/completions`, `/v1/models`) so external clients (Cursor, Continue.dev, Open WebUI, any OpenAI SDK client) can use my chatbot as an API backend.

## What I Need

1. **`POST /v1/chat/completions`** — Accept OpenAI-format requests, route to my existing providers, return OpenAI-format responses (both streaming SSE and non-streaming JSON)
2. **`GET /v1/models`** — List available models in OpenAI format
3. **Bearer token auth** — Simple API key validation (not my existing session auth)
4. **Tool/function calling pass-through** — If the client sends OpenAI-format tools, map them through
5. **Streaming** — Must support `stream: true` with proper `data: {"choices":[...]}` SSE format with `[DONE]` sentinel

## My Current Architecture

### Provider Setup (`lib/ai/providers.ts`)

```typescript
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { getMaxAccessToken } from "./max-oauth";
import { getOpenAICodexAuthContext } from "./openai-codex-oauth";

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const CLAUDE_MAX_BETA_FLAGS =
  "oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14";
const OPENAI_CODEX_RESPONSES_PATH = "/responses";
const OPENAI_CODEX_REWRITTEN_RESPONSES_PATH = "/codex/responses";
const OPENAI_CODEX_DEFAULT_INSTRUCTIONS =
  "You are Codex, OpenAI's coding assistant.";

function getCodexSystemPrompt(modelSlug: string): string {
  return `<codex_behavior>
<model_information>
Model slug: ${modelSlug}
Runtime: OpenAI Codex via ChatGPT backend API
Role: terminal-first coding agent
</model_information>
<identity>
You are a coding agent running in the Codex CLI, a terminal-based coding assistant.
Codex CLI is an open source project led by OpenAI.
Be precise, safe, and helpful.
</identity>
<capabilities>
- Receive user prompts and workspace context.
- Communicate with concise progress and final responses.
- Execute terminal commands and apply patches.
- Maintain plans when tasks are multi-step.
</capabilities>
<working_style>
- Be concise, direct, and friendly.
- Prefer practical, actionable output over long explanations.
- State assumptions clearly and preserve user intent.
- Avoid unnecessary verbosity and unrelated changes.
</working_style>
<execution_rules>
- Prioritize safe operations.
- Respect repository conventions and AGENTS.md instructions when present.
- Keep fixes focused on root cause.
- Preserve behavior unless change is intentional.
</execution_rules>
</codex_behavior>`;
}

function mergeCodexInstructions(
  modelSlug: string,
  userInstructions: string
): string {
  const codexPrompt = getCodexSystemPrompt(modelSlug);
  const trimmedUserInstructions = userInstructions.trim();

  if (trimmedUserInstructions.includes("<codex_behavior>")) {
    return trimmedUserInstructions;
  }

  return `${codexPrompt}\n\n${trimmedUserInstructions}`;
}

function sanitizeCodexInput(
  body: Record<string, unknown>
): Record<string, unknown> {
  const inputItems = Array.isArray(body.input) ? body.input : null;

  if (inputItems) {
    body.input = inputItems
      .filter((item) => {
        if (!item || typeof item !== "object") return true;
        const candidate = item as Record<string, unknown>;
        return candidate.type !== "item_reference";
      })
      .map((item) => {
        if (!item || typeof item !== "object") return item;
        const candidate = { ...(item as Record<string, unknown>) };

        if (typeof candidate.id === "string" && candidate.id.startsWith("rs_")) {
          delete candidate.id;
        }

        return candidate;
      });
  }

  delete body.previous_response_id;
  delete body.conversation;

  return body;
}

const CLAUDE_CODE_SYSTEM_MSG = {
  type: "text" as const,
  text: "You are Claude Code, Anthropic's official CLI for Claude.",
};

const claudeMaxDirect = createAnthropic({
  baseURL: "https://api.anthropic.com/v1",
  apiKey: "placeholder",
  fetch: async (input, init) => {
    const token = await getMaxAccessToken();
    const headers = new Headers(init?.headers);
    headers.delete("x-api-key");
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("anthropic-beta", CLAUDE_MAX_BETA_FLAGS);

    // Inject required Claude Code system prompt as first element
    if (init?.body && typeof init.body === "string") {
      try {
        const body = JSON.parse(init.body);
        const existing = body.system;
        const systemArray: Array<{ type: string; text: string }> = [];

        if (typeof existing === "string") {
          systemArray.push({ type: "text", text: existing });
        } else if (Array.isArray(existing)) {
          systemArray.push(...existing);
        }

        const hasIt =
          systemArray.length > 0 &&
          systemArray[0].type === "text" &&
          systemArray[0].text === CLAUDE_CODE_SYSTEM_MSG.text;

        if (!hasIt) {
          systemArray.unshift(CLAUDE_CODE_SYSTEM_MSG);
        }

        body.system = systemArray;
        return globalThis.fetch(input, {
          ...init,
          body: JSON.stringify(body),
          headers,
        });
      } catch {
        // If body parsing fails, send as-is
      }
    }

    return globalThis.fetch(input, { ...init, headers });
  },
});

function rewriteUrlForCodex(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === "string") {
    return input.replace(
      OPENAI_CODEX_RESPONSES_PATH,
      OPENAI_CODEX_REWRITTEN_RESPONSES_PATH
    );
  }

  if (input instanceof URL) {
    return new URL(
      input.toString().replace(
        OPENAI_CODEX_RESPONSES_PATH,
        OPENAI_CODEX_REWRITTEN_RESPONSES_PATH
      )
    );
  }

  return input;
}

const openAICodexDirect = createOpenAI({
  baseURL: "https://chatgpt.com/backend-api",
  apiKey: "placeholder",
  fetch: async (input, init) => {
    const { accessToken, accountId } = await getOpenAICodexAuthContext();
    const headers = new Headers(init?.headers);
    headers.delete("x-api-key");
    headers.set("Authorization", `Bearer ${accessToken}`);
    headers.set("chatgpt-account-id", accountId);
    headers.set("OpenAI-Beta", "responses=experimental");
    headers.set("originator", "codex_cli_rs");

    let updatedInit = init;
    if (init?.body && typeof init.body === "string") {
      try {
        const body = JSON.parse(init.body) as Record<string, unknown>;
        const modelSlug =
          typeof body.model === "string" && body.model.length > 0
            ? body.model
            : "unknown-codex-model";
        const instructions = body.instructions;

        if (typeof instructions !== "string" || instructions.trim().length === 0) {
          let inferredInstructions = "";
          const inputItems = Array.isArray(body.input) ? body.input : [];

          for (const item of inputItems) {
            if (!item || typeof item !== "object") continue;
            const candidate = item as Record<string, unknown>;
            if (candidate.role !== "system" && candidate.role !== "developer") continue;

            const content = candidate.content;
            if (typeof content === "string" && content.trim().length > 0) {
              inferredInstructions = content.trim();
              break;
            }

            if (Array.isArray(content)) {
              const textParts = content
                .map((part) => {
                  if (!part || typeof part !== "object") return "";
                  const piece = part as Record<string, unknown>;
                  const text = piece.text;
                  return typeof text === "string" ? text : "";
                })
                .filter((text) => text.trim().length > 0);

              if (textParts.length > 0) {
                inferredInstructions = textParts.join("\n").trim();
                break;
              }
            }
          }

          body.instructions =
            inferredInstructions || OPENAI_CODEX_DEFAULT_INSTRUCTIONS;
        }

        if (typeof body.instructions === "string" && body.instructions.trim().length > 0) {
          body.instructions = mergeCodexInstructions(modelSlug, body.instructions);
        }

        body.store = false;
        body.stream = true;
        delete body.max_output_tokens;
        delete body.max_completion_tokens;

        updatedInit = {
          ...init,
          body: JSON.stringify(sanitizeCodexInput(body)),
        };
      } catch {
        // Keep original body if parsing fails.
      }
    }

    return globalThis.fetch(rewriteUrlForCodex(input), { ...updatedInit, headers });
  },
});

export function getLanguageModel(modelId: string) {
  if (modelId.startsWith("openai-codex-direct/")) {
    const codexModelId = modelId
      .replace(/^openai-codex-direct\//, "")
      .replace(/-think-(low|medium|high)$/, "");
    return openAICodexDirect.languageModel(codexModelId);
  }

  // Default route remains claude-max-direct
  const maxModelId = modelId
    .replace(/^claude-max-direct\//, "")
    .replace(/-think-(low|medium|high)$/, "");
  return claudeMaxDirect.languageModel(maxModelId);
}

export function getFallbackModel() {
  return groq.languageModel("openai/gpt-oss-120b");
}
```

### Models (`lib/ai/models.ts`)

```typescript
export const DEFAULT_CHAT_MODEL = "claude-max-direct/claude-opus-4-6";
export const OPENAI_CODEX_CHAT_MODEL = "openai-codex-direct/gpt-5.3-codex";
export const FALLBACK_CHAT_MODEL = "openai/gpt-oss-120b";
```

### Current Chat Route (`app/(chat)/api/chat/route.ts`)

```typescript
import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
} from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getFallbackModel, getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getBaronLocation } from "@/lib/ai/tools/get-baron-location";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { queryWolframAlpha } from "@/lib/ai/tools/wolfram-alpha";
import { executeCode } from "@/lib/ai/tools/e2b";
import { getAlphaVantageTools } from "@/lib/ai/mcp/alphavantage";
import { getAWSTools } from "@/lib/ai/mcp/aws";
import { getExaTools } from "@/lib/ai/mcp/exa";
import { getGitHubTools } from "@/lib/ai/mcp/github";
import { getGoogleMapsTools } from "@/lib/ai/mcp/google-maps";
import { getNeonTools } from "@/lib/ai/mcp/neon";
import { getNotionTools } from "@/lib/ai/mcp/notion";
import { getStripeTools } from "@/lib/ai/mcp/stripe";
import { getTerraformTools } from "@/lib/ai/mcp/terraform";
import { getLinearTools } from "@/lib/ai/mcp/linear";
import { getVercelTools } from "@/lib/ai/mcp/vercel";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 300;

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (parseError) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      messages,
      selectedChatModel,
      selectedVisibilityType,
      thinkingBudget: clientBudget,
      maxTokens: clientMaxTokens,
    } = requestBody;

    const session = await auth();
    const userId = session?.user?.id ?? "guest";
    const userType: UserType = session?.user?.type ?? "guest";

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (!isToolApprovalFlow) {
        messagesFromDb = await getMessagesByChatId({ id });
      }
    } else if (message?.role === "user") {
      await saveChat({
        id,
        userId: userId,
        title: "New chat",
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
    }

    const uiMessages = isToolApprovalFlow
      ? (messages as ChatMessage[])
      : [...convertToUIMessages(messagesFromDb), message as ChatMessage];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = { longitude, latitude, city, country };

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    const isReasoningModel =
      selectedChatModel.includes("reasoning") ||
      selectedChatModel.includes("thinking");

    // Thinking budget: client slider > model ID suffix > max for claude-max models > null
    const thinkMatch = selectedChatModel.match(/-think-(low|medium|high)$/);
    let thinkingBudget = clientBudget ?? (thinkMatch
      ? { low: 10_000, medium: 32_000, high: 128_000 }[thinkMatch[1]]
      : null);
    const enableThinking = isReasoningModel || thinkingBudget !== null;

    let maxTokens = clientMaxTokens ?? (thinkingBudget
      ? thinkingBudget + 16_000
      : enableThinking ? 26_000 : 16_000);

    const MODEL_MAX_OUTPUT = 128_000;
    if (maxTokens > MODEL_MAX_OUTPUT) maxTokens = MODEL_MAX_OUTPUT;
    if (thinkingBudget && thinkingBudget >= maxTokens) {
      thinkingBudget = maxTokens - 1000;
    }

    const modelMessages = await convertToModelMessages(uiMessages);

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        const [neon, github, vercel, notion, terraform, aws, exa, alphaVantage, googleMaps, stripe, linear] = await Promise.all([
          getNeonTools(), getGitHubTools(), getVercelTools(), getNotionTools(),
          getTerraformTools(), getAWSTools(), getExaTools(), getAlphaVantageTools(),
          getGoogleMapsTools(), getStripeTools(), getLinearTools(),
        ]);

        const sharedStreamOpts = {
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: modelMessages,
          stopWhen: stepCountIs(1000),
          experimental_activeTools: isReasoningModel ? [] : [
            "getWeather", "getBaronLocation", "createDocument", "updateDocument",
            "requestSuggestions", "queryWolframAlpha", "executeCode",
            ...(neon.toolNames as string[]), ...(github.toolNames as string[]),
            ...(vercel.toolNames as string[]), ...(notion.toolNames as string[]),
            ...(terraform.toolNames as string[]), ...(aws.toolNames as string[]),
            ...(exa.toolNames as string[]), ...(alphaVantage.toolNames as string[]),
            ...(googleMaps.toolNames as string[]), ...(stripe.toolNames as string[]),
            ...(linear.toolNames as string[]),
          ] as any,
          tools: {
            getWeather, getBaronLocation,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({ session, dataStream }),
            queryWolframAlpha, executeCode,
            ...neon.tools, ...github.tools, ...vercel.tools, ...notion.tools,
            ...terraform.tools, ...aws.tools, ...exa.tools, ...alphaVantage.tools,
            ...googleMaps.tools, ...stripe.tools, ...linear.tools,
          },
          onFinish: async () => {
            await Promise.all([
              neon.cleanup(), github.cleanup(), vercel.cleanup(), notion.cleanup(),
              terraform.cleanup(), aws.cleanup(), exa.cleanup(), alphaVantage.cleanup(),
              googleMaps.cleanup(), stripe.cleanup(), linear.cleanup(),
            ]);
          },
        } as const;

        const providerOptions =
          enableThinking
            ? { anthropic: { thinking: { type: "enabled", budgetTokens: thinkingBudget ?? 10_000 } } }
            : undefined;

        try {
          const result = streamText({
            model: getLanguageModel(selectedChatModel),
            maxOutputTokens: maxTokens,
            providerOptions,
            ...sharedStreamOpts,
          });

          dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));
          const res = await result.response;
        } catch (primaryError) {
          const fallbackResult = streamText({
            model: getFallbackModel(),
            maxOutputTokens: Math.min(maxTokens, 65_536),
            ...sharedStreamOpts,
          });
          dataStream.merge(fallbackResult.toUIMessageStream({ sendReasoning: true }));
          await fallbackResult.response;
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            })),
          });
        }
      },
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) return;
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(streamId, () => sseStream);
          }
        } catch (_) {}
      },
    });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError("offline:chat").toResponse();
  }
}
```

### Request Schema (`app/(chat)/api/chat/schema.ts`)

```typescript
import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

const userMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user"]),
  parts: z.array(partSchema),
});

const messageSchema = z.object({
  id: z.string(),
  role: z.string(),
  parts: z.array(z.any()),
});

export const postRequestBodySchema = z.object({
  id: z.string().min(1),
  message: userMessageSchema.optional(),
  messages: z.array(messageSchema).optional(),
  selectedChatModel: z.string(),
  selectedVisibilityType: z.enum(["public", "private"]),
  thinkingBudget: z.number().optional(),
  maxTokens: z.number().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
```

### System Prompts (`lib/ai/prompts.ts`)

```typescript
export const regularPrompt = `You are a friendly assistant! Keep your responses concise and helpful.

When asked to write, create, or help with something, just do it directly. Don't ask clarifying questions unless absolutely necessary - make reasonable assumptions and proceed with the task.`;

export type RequestHints = {
  latitude: Geo["latitude"];
  longitude: Geo["longitude"];
  city: Geo["city"];
  country: Geo["country"];
};

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);
  const maxPrefix =
    selectedChatModel.startsWith("claude-max/") ||
    selectedChatModel.startsWith("claude-max-direct/")
      ? "You are Claude Code, Anthropic's official CLI for Claude.\n\n"
      : "";

  if (
    selectedChatModel.includes("reasoning") ||
    selectedChatModel.includes("thinking")
  ) {
    return `${maxPrefix}${regularPrompt}\n\n${requestPrompt}`;
  }

  return `${maxPrefix}${regularPrompt}\n\n${requestPrompt}\n\n${artifactsPrompt}`;
};
```

### DB Schema (`lib/db/schema.ts`)

```typescript
export const chat = pgTable("Chat", {
  id: text("id").primaryKey().notNull(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId").notNull().references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] }).notNull().default("private"),
});

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: text("chatId").notNull().references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export const stream = pgTable("Stream", {
  id: uuid("id").notNull().defaultRandom(),
  chatId: text("chatId").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});
```

### Environment Variables Available

```
AUTH_SECRET, POSTGRES_URL, REDIS_URL,
CLAUDE_MAX_REFRESH_TOKEN, OPENAI_CODEX_REFRESH_TOKEN,
GROQ_API_KEY, E2B_API_KEY,
NEON_API_KEY, GITHUB_PERSONAL_ACCESS_TOKEN,
VERCEL_MCP_TOKEN, NOTION_MCP_TOKEN,
EXA_API_KEY, ALPHA_VANTAGE_API_KEY,
GOOGLE_MAPS_API_KEY, STRIPE_SECRET_KEY, LINEAR_API_KEY
```

## Requirements for the OpenAI-Compatible API

### 1. Route Structure
Create these Next.js App Router routes:
- `app/api/v1/chat/completions/route.ts` — Main completions endpoint
- `app/api/v1/models/route.ts` — Models list

### 2. Request Format (accept standard OpenAI)
```json
{
  "model": "claude-opus-4-6",
  "messages": [
    {"role": "system", "content": "You are helpful."},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 4096,
  "tools": [...],
  "tool_choice": "auto"
}
```

### 3. Response Format — Non-streaming
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "claude-opus-4-6",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Hello!"},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
}
```

### 4. Response Format — Streaming SSE
```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"claude-opus-4-6","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"claude-opus-4-6","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"claude-opus-4-6","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

### 5. Model Mapping
Map friendly model names to my internal provider IDs:
- `claude-opus-4-6` or `claude-opus` → `claude-max-direct/claude-opus-4-6`
- `claude-sonnet-4-5` or `claude-sonnet` → `claude-max-direct/claude-sonnet-4-5`
- `claude-haiku-4-5` or `claude-haiku` → `claude-max-direct/claude-haiku-4-5`
- `gpt-5.3-codex` or `codex` → `openai-codex-direct/gpt-5.3-codex`
- `groq-fallback` → use `getFallbackModel()` directly
- Default to `claude-max-direct/claude-opus-4-6`

### 6. Auth
- Check `Authorization: Bearer <token>` header
- Validate against `process.env.OPENAI_COMPAT_API_KEY` env var
- Return 401 with OpenAI-format error if invalid

### 7. Key Design Decisions
- **Reuse `getLanguageModel()` and `getFallbackModel()`** from my existing providers — don't create new provider instances
- **Use `streamText()` and `generateText()`** from the AI SDK directly (not the UI stream helpers)
- **Convert OpenAI messages format to AI SDK messages format** before passing to streamText/generateText
- **Convert AI SDK response back to OpenAI format** for the response
- **Include MCP tools** — initialize the same MCP tool sets and include them
- **Include built-in tools** (getWeather, executeCode, queryWolframAlpha, etc.)
- **Handle tool calls** — if the model calls tools, execute them and return tool_calls in OpenAI format; for multi-step agentic loops, let them run server-side and return the final text response
- **Optionally save to DB** — controlled by a query param like `?save=true`

### 8. OpenAI Tool Call Format (for reference)
When the model calls tools, streaming chunks look like:
```json
{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_xxx","type":"function","function":{"name":"getWeather","arguments":""}}]}}]}
{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\"city\":"}}]}}]}
{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"NYC\"}"}}]}}]}
```

## What I Want You to Build

Please provide complete, production-ready TypeScript code for:

1. **`app/api/v1/chat/completions/route.ts`** — Full implementation with:
   - OpenAI request parsing & validation
   - Model name mapping to internal IDs
   - Bearer token auth
   - Message format conversion (OpenAI → AI SDK)
   - Both streaming and non-streaming paths
   - Tool/function calling support with proper OpenAI format output
   - MCP tools initialization
   - Built-in tools inclusion
   - Error handling returning OpenAI-format errors
   - Usage stats in response when available
   - Fallback model support

2. **`app/api/v1/models/route.ts`** — List available models in OpenAI format

3. **`lib/ai/openai-compat.ts`** — Helper utilities:
   - `convertOpenAIMessagesToAISDK()` — message format converter
   - `convertAISDKResponseToOpenAI()` — response format converter
   - `createOpenAIStreamTransformer()` — TransformStream that converts AI SDK stream chunks to OpenAI SSE format
   - Model name mapping constants
   - OpenAI error response helpers

4. **Any type definitions** needed in `lib/types.ts` or a new types file

Make sure the streaming implementation properly handles:
- First chunk with `role: "assistant"` in delta
- Content chunks with `delta.content`
- Tool call chunks with `delta.tool_calls` array
- Final chunk with `finish_reason: "stop"` or `"tool_calls"`
- `data: [DONE]` sentinel
- Proper SSE format with `data: ` prefix and double newlines

The code should work in Next.js App Router with `export const maxDuration = 300` and handle edge cases like empty responses, model errors, rate limits, etc.
