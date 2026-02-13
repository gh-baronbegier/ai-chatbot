export const preferredRegion = "pdx1";

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
import { auth } from "@/app/(auth)/auth";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getFallbackModel, getLanguageModel } from "@/lib/ai/providers";
import { getBaronLocation } from "@/lib/ai/tools/get-baron-location";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { queryWolframAlpha } from "@/lib/ai/tools/wolfram-alpha";
import { executeCode } from "@/lib/ai/tools/e2b";
import { loadAllMCPTools } from "@/lib/ai/mcp";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
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

export const maxDuration = 800;

function resolveThinkingBudget(
  selectedChatModel: string,
  clientBudget: number | null | undefined
): number | null {
  if (clientBudget != null) return clientBudget;

  const thinkMatch = selectedChatModel.match(/-think-(low|medium|high)$/);
  if (thinkMatch) {
    return { low: 10_000, medium: 32_000, high: 128_000 }[thinkMatch[1]]!;
  }

  const isClaudeMaxModel =
    selectedChatModel.startsWith("claude-max/") ||
    selectedChatModel.startsWith("claude-max-direct/");
  if (isClaudeMaxModel) return 128_000;

  return null;
}

function resolveMaxTokens(
  thinkingBudget: number | null,
  enableThinking: boolean,
  clientMaxTokens: number | null | undefined
): number {
  if (clientMaxTokens != null) return Math.min(clientMaxTokens, 128_000);

  const tokens = thinkingBudget
    ? thinkingBudget + 16_000
    : enableThinking
      ? 26_000
      : 16_000;

  return Math.min(tokens, 128_000);
}

function clampThinkingBudget(
  thinkingBudget: number | null,
  maxTokens: number
): number | null {
  if (thinkingBudget && thinkingBudget >= maxTokens) {
    return maxTokens - 1000;
  }
  return thinkingBudget;
}

function buildToolConfig(
  isReasoningModel: boolean,
  mcpToolNames: string[],
  mcpTools: Record<string, any>
) {
  const activeTools = isReasoningModel
    ? []
    : [
        "getWeather",
        "getBaronLocation",
        "queryWolframAlpha",
        "executeCode",
        ...mcpToolNames,
      ];

  const tools = {
    getWeather,
    getBaronLocation,
    queryWolframAlpha,
    executeCode,
    ...mcpTools,
  };

  return { activeTools, tools };
}

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (parseError) {
    console.error("[chat] Request validation failed:", parseError);
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

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

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
    const isClaudeMaxModel =
      selectedChatModel.startsWith("claude-max/") ||
      selectedChatModel.startsWith("claude-max-direct/");
    const isOpenAICodexModel =
      selectedChatModel.startsWith("openai-codex-direct/");

    const resolvedBudget = resolveThinkingBudget(selectedChatModel, clientBudget);
    const enableThinking = isReasoningModel || resolvedBudget !== null;
    const maxTokens = resolveMaxTokens(resolvedBudget, enableThinking, clientMaxTokens);
    const thinkingBudget = clampThinkingBudget(resolvedBudget, maxTokens);

    const modelMessages = await convertToModelMessages(uiMessages);

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        const mcp = await loadAllMCPTools();
        const { activeTools, tools } = buildToolConfig(
          isReasoningModel,
          mcp.toolNames,
          mcp.tools
        );

        const sharedStreamOpts = {
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: modelMessages,
          stopWhen: stepCountIs(1000),
          experimental_activeTools: activeTools as any,
          tools,
          onFinish: async () => {
            await mcp.cleanup();
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        } as const;

        const openaiReasoningEffort =
          selectedChatModel.includes("gpt-5.3-codex") ? "xhigh" : "high";

        const providerOptions: Parameters<typeof streamText>[0]["providerOptions"] =
          isClaudeMaxModel && enableThinking
            ? {
                anthropic: {
                  thinking: { type: "enabled", budgetTokens: thinkingBudget ?? 10_000 },
                },
              }
            : isOpenAICodexModel
              ? {
                  openai: {
                    store: false,
                    reasoningEffort: openaiReasoningEffort,
                  },
                }
              : undefined;

        const writeModelSelection = (resolvedModel: string, fallback: boolean) => {
          dataStream.write({
            type: "data-chat-model",
            data: {
              requested: selectedChatModel,
              resolved: resolvedModel,
              fallback,
            },
            transient: true,
          });
        };

        try {
          const result = streamText({
            model: getLanguageModel(selectedChatModel),
            maxOutputTokens: maxTokens,
            providerOptions,
            ...sharedStreamOpts,
          });

          dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));

          // Force await to catch stream-level errors early
          const res = await result.response;
          writeModelSelection(res.modelId, false);
        } catch (primaryError) {
          console.warn("[chat] Primary model failed, falling back to Groq:", primaryError);

          const fallbackResult = streamText({
            model: getFallbackModel(),
            maxOutputTokens: Math.min(maxTokens, 65_536),
            ...sharedStreamOpts,
          });

          dataStream.merge(fallbackResult.toUIMessageStream({ sendReasoning: true }));

          const fallbackRes = await fallbackResult.response;
          writeModelSelection(fallbackRes.modelId, true);
        }

        if (titlePromise) {
          const title = await titlePromise;
          dataStream.write({ type: "data-chat-title", data: title });
          updateChatTitleById({ chatId: id, title });
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (isToolApprovalFlow) {
          for (const finishedMsg of finishedMessages) {
            const existingMsg = uiMessages.find((m) => m.id === finishedMsg.id);
            if (existingMsg) {
              await updateMessage({
                id: finishedMsg.id,
                parts: finishedMsg.parts,
              });
            } else {
              await saveMessages({
                messages: [
                  {
                    id: finishedMsg.id,
                    role: finishedMsg.role,
                    parts: finishedMsg.parts,
                    createdAt: new Date(),
                    attachments: [],
                    chatId: id,
                  },
                ],
              });
            }
          }
        } else if (finishedMessages.length > 0) {
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
      onError: () => "Oops, an error occurred!",
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
            );
          }
        } catch (_) {
          // ignore redis errors
        }
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chatToDelete = await getChatById({ id });

  if (!chatToDelete) {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  if (chatToDelete.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
