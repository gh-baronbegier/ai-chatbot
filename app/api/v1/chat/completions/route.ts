import {
  generateText,
  jsonSchema,
  stepCountIs,
  streamText,
} from "ai";

import { systemPrompt, type RequestHints } from "@/lib/ai/prompts";
import { getFallbackModel, getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getBaronLocation } from "@/lib/ai/tools/get-baron-location";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { queryWolframAlpha } from "@/lib/ai/tools/wolfram-alpha";
import { executeCode } from "@/lib/ai/tools/e2b";

import { getNeonTools } from "@/lib/ai/mcp/neon";
import { getGitHubTools } from "@/lib/ai/mcp/github";
import { getVercelTools } from "@/lib/ai/mcp/vercel";
import { getNotionTools } from "@/lib/ai/mcp/notion";
import { getTerraformTools } from "@/lib/ai/mcp/terraform";
import { getAWSTools } from "@/lib/ai/mcp/aws";
import { getExaTools } from "@/lib/ai/mcp/exa";
import { getAlphaVantageTools } from "@/lib/ai/mcp/alphavantage";
import { getGoogleMapsTools } from "@/lib/ai/mcp/google-maps";
import { getStripeTools } from "@/lib/ai/mcp/stripe";
import { getLinearTools } from "@/lib/ai/mcp/linear";

import {
  type OpenAIChatRequest,
  convertOpenAIMessagesToAISDK,
  createOpenAIStreamTransformer,
  convertAISDKResponseToOpenAI,
  resolveOpenAICompatModel,
  openAIErrorResponse,
  validateAuth,
  corsHeaders,
  mapToolChoice,
} from "@/lib/ai/openai-compat";

export const maxDuration = 300;

// ---- CORS preflight ----
export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// ---- No-op dataStream writer for UI-dependent tools ----
const noopDataStream = {
  write() {},
  merge() {},
} as any;

// ---- POST /api/v1/chat/completions ----
export async function POST(request: Request) {
  // 1. Auth check
  const authResult = validateAuth(request.headers);
  if (!authResult.valid) return authResult.error!;

  // 2. Parse body
  let body: OpenAIChatRequest;
  try {
    body = await request.json();
  } catch {
    return openAIErrorResponse(400, "Invalid JSON in request body.");
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return openAIErrorResponse(400, "messages is required and must be a non-empty array.");
  }

  // 3. Reject n > 1
  if (body.n && body.n > 1) {
    return openAIErrorResponse(400, "n > 1 is not supported.", "invalid_request_error", "unsupported_parameter");
  }

  // 4. Resolve model
  const { publicModel, internalModelId, useFallback } = resolveOpenAICompatModel(body.model);

  // 5. Convert messages
  const { system: clientSystem, modelMessages } = convertOpenAIMessagesToAISDK(body.messages);

  // 6. Build system prompt
  const requestHints: RequestHints = {
    latitude: undefined,
    longitude: undefined,
    city: undefined,
    country: undefined,
  };

  const internalSystem = systemPrompt({
    selectedChatModel: useFallback ? "groq-fallback" : internalModelId,
    requestHints,
  });
  const mergedSystem = clientSystem
    ? `${internalSystem}\n\n${clientSystem}`
    : internalSystem;

  // 7. Init MCP tools
  let mcpSources: Array<{ tools: Record<string, unknown>; toolNames: string[]; cleanup: () => Promise<void> }> = [];
  try {
    const [neon, github, vercel, notion, terraform, aws, exa, alphaVantage, googleMaps, stripe, linear] =
      await Promise.all([
        getNeonTools(),
        getGitHubTools(),
        getVercelTools(),
        getNotionTools(),
        getTerraformTools(),
        getAWSTools(),
        getExaTools(),
        getAlphaVantageTools(),
        getGoogleMapsTools(),
        getStripeTools(),
        getLinearTools(),
      ]);
    mcpSources = [neon, github, vercel, notion, terraform, aws, exa, alphaVantage, googleMaps, stripe, linear] as any;
  } catch (err) {
    console.warn("[openai-compat] MCP init failed, continuing without MCP tools:", err);
  }

  // 8. Build tool set
  const serverTools: Record<string, unknown> = {
    getWeather,
    getBaronLocation,
    createDocument: createDocument({ session: null, dataStream: noopDataStream }),
    updateDocument: updateDocument({ session: null, dataStream: noopDataStream }),
    requestSuggestions: requestSuggestions({ session: null, dataStream: noopDataStream }),
    queryWolframAlpha,
    executeCode,
  };

  for (const mcp of mcpSources) {
    Object.assign(serverTools, mcp.tools);
  }

  // Client-provided tools: definition-only (no execute)
  const clientTools: Record<string, unknown> = {};
  if (body.tools && Array.isArray(body.tools)) {
    for (const t of body.tools) {
      if (t.type === "function" && t.function?.name) {
        // Only add if we don't already have a server tool with this name
        if (!serverTools[t.function.name]) {
          clientTools[t.function.name] = {
            description: t.function.description ?? "",
            inputSchema: jsonSchema(
              t.function.parameters ?? { type: "object", properties: {} }
            ),
            // No execute — the model can call it but the client handles execution
          };
        }
      }
    }
  }

  const allTools = { ...serverTools, ...clientTools } as any;

  const allToolNames = Object.keys(allTools);

  // 9. Map tool_choice
  const toolChoice = mapToolChoice(body.tool_choice);

  // 10. Shared options
  const maxTokens = body.max_completion_tokens ?? body.max_tokens ?? 16_000;

  const isClaudeMax =
    internalModelId.startsWith("claude-max-direct/") ||
    internalModelId.startsWith("claude-max/");

  // Only enable thinking for Opus (large output budget); Haiku/Sonnet have smaller limits
  const isOpus = internalModelId.includes("claude-opus");
  const providerOptions = (
    isClaudeMax && isOpus
      ? {
          anthropic: {
            thinking: { type: "enabled" as const, budgetTokens: 128_000 },
          },
        }
      : isClaudeMax
        ? {
            anthropic: {
              thinking: { type: "enabled" as const, budgetTokens: 10_000 },
            },
          }
        : undefined
  ) satisfies Parameters<typeof streamText>[0]["providerOptions"];

  // Cap maxOutputTokens based on model
  const modelMaxOutput = isOpus ? 128_000 : isClaudeMax ? 64_000 : 128_000;
  const effectiveMaxTokens = Math.min(maxTokens, modelMaxOutput);

  const sharedOpts = {
    system: mergedSystem,
    messages: modelMessages as any,
    tools: allTools,
    experimental_activeTools: allToolNames as any,
    toolChoice,
    maxOutputTokens: effectiveMaxTokens,
    providerOptions,
    stopWhen: stepCountIs(1000),
  };

  const cleanupMCP = async () => {
    await Promise.all(mcpSources.map((s) => s.cleanup().catch(() => {})));
  };

  try {
    if (body.stream) {
      // ---- Streaming path ----
      try {
        const model = useFallback ? getFallbackModel() : getLanguageModel(internalModelId);
        const result = streamText({ model, ...sharedOpts });

        const transformer = createOpenAIStreamTransformer({ model: publicModel });
        const outputStream = result.fullStream.pipeThrough(transformer);

        // Clean up MCP after stream completes
        result.response.then(() => cleanupMCP()).catch(() => cleanupMCP());

        return new Response(outputStream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            ...corsHeaders(),
          },
        });
      } catch (primaryError) {
        console.warn("[openai-compat] Primary model failed (stream), falling back:", primaryError);
        const fallbackResult = streamText({
          model: getFallbackModel(),
          ...sharedOpts,
          maxOutputTokens: Math.min(maxTokens, 65_536),
          providerOptions: undefined,
        });

        const transformer = createOpenAIStreamTransformer({ model: "groq-fallback" });
        const outputStream = fallbackResult.fullStream.pipeThrough(transformer);
        fallbackResult.response.then(() => cleanupMCP()).catch(() => cleanupMCP());

        return new Response(outputStream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            ...corsHeaders(),
          },
        });
      }
    } else {
      // ---- Non-streaming path ----
      try {
        const model = useFallback ? getFallbackModel() : getLanguageModel(internalModelId);
        const result = await generateText({ model, ...sharedOpts });
        const response = convertAISDKResponseToOpenAI(result as any, publicModel);
        return Response.json(response, { headers: corsHeaders() });
      } catch (primaryError) {
        console.warn("[openai-compat] Primary model failed (non-stream), falling back:", primaryError);
        const fallbackResult = await generateText({
          model: getFallbackModel(),
          ...sharedOpts,
          maxOutputTokens: Math.min(maxTokens, 65_536),
          providerOptions: undefined,
        });
        const response = convertAISDKResponseToOpenAI(fallbackResult as any, "groq-fallback");
        return Response.json(response, { headers: corsHeaders() });
      }
    }
  } catch (err) {
    console.error("[openai-compat] Unhandled error:", err);
    return openAIErrorResponse(
      500,
      err instanceof Error ? err.message : "Internal server error",
      "server_error",
      "internal_error",
    );
  } finally {
    await cleanupMCP();
  }
}
