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
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getBaronLocation } from "@/lib/ai/tools/get-baron-location";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { getAWSTools } from "@/lib/ai/mcp/aws";
import { getGitHubTools } from "@/lib/ai/mcp/github";
import { getNeonTools } from "@/lib/ai/mcp/neon";
import { getNotionTools } from "@/lib/ai/mcp/notion";
import { getTerraformTools } from "@/lib/ai/mcp/terraform";
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

export { getStreamContext };

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
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

    console.log("[chat] selectedChatModel:", selectedChatModel, "| thinkingBudget:", clientBudget, "| maxTokens:", clientMaxTokens);

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    // const messageCount = await getMessageCountByUserId({
    //   id: session.user.id,
    //   differenceInHours: 24,
    // });

    // if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
    //   return new ChatSDKError("rate_limit:chat").toResponse();
    // }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      if (!isToolApprovalFlow) {
        messagesFromDb = await getMessagesByChatId({ id });
      }
    } else if (message?.role === "user") {
      await saveChat({
        id,
        userId: session.user.id,
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

    // Thinking budget: client slider > model ID suffix > null
    const thinkMatch = selectedChatModel.match(/-think-(low|medium|high)$/);
    let thinkingBudget = clientBudget ?? (thinkMatch
      ? { low: 10_000, medium: 32_000, high: 128_000 }[thinkMatch[1]]
      : null);
    const enableThinking = isReasoningModel || thinkingBudget !== null;

    // Max tokens: client slider > derived from thinking budget > defaults
    let maxTokens = clientMaxTokens ?? (thinkingBudget
      ? thinkingBudget + 16_000
      : enableThinking
        ? 26_000
        : 16_000);

    // Anthropic: max_tokens capped at 128K, and must be > budget_tokens
    const MODEL_MAX_OUTPUT = 128_000;
    if (maxTokens > MODEL_MAX_OUTPUT) {
      maxTokens = MODEL_MAX_OUTPUT;
    }
    if (thinkingBudget && thinkingBudget >= maxTokens) {
      // Shrink budget to leave room for response output
      thinkingBudget = maxTokens - 1000;
    }

    console.log("[chat] resolved → enableThinking:", enableThinking, "| thinkingBudget:", thinkingBudget, "| maxTokens:", maxTokens);

    const modelMessages = await convertToModelMessages(uiMessages);

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        const [neon, github, vercel, notion, terraform, aws] = await Promise.all([
          getNeonTools(),
          getGitHubTools(),
          getVercelTools(),
          getNotionTools(),
          getTerraformTools(),
          getAWSTools(),
        ]);

        const result = streamText({
          model: getLanguageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: modelMessages,
          maxOutputTokens: maxTokens,
          stopWhen: stepCountIs(1000),
          experimental_activeTools: isReasoningModel
            ? []
            : [
                "getWeather",
                "getBaronLocation",
                "createDocument",
                "updateDocument",
                "requestSuggestions",
                ...(neon.toolNames as string[]),
                ...(github.toolNames as string[]),
                ...(vercel.toolNames as string[]),
                ...(notion.toolNames as string[]),
                ...(terraform.toolNames as string[]),
                ...(aws.toolNames as string[]),
              ] as any,
          providerOptions: enableThinking
            ? {
                anthropic: {
                  thinking: { type: "enabled", budgetTokens: thinkingBudget ?? 10_000 },
                },
              }
            : undefined,
          tools: {
            getWeather,
            getBaronLocation,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({ session, dataStream }),
            ...neon.tools,
            ...github.tools,
            ...vercel.tools,
            ...notion.tools,
            ...terraform.tools,
            ...aws.tools,
          },
          onFinish: async () => {
            await Promise.all([neon.cleanup(), github.cleanup(), vercel.cleanup(), notion.cleanup(), terraform.cleanup(), aws.cleanup()]);
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));

        result.request.then((req) => {
          console.log("[chat] raw request body:", JSON.stringify(req.body, null, 2));
        }).catch(() => {});

        result.response.then((res) => {
          console.log("[chat] response modelId:", res.modelId);
          console.log("[chat] response headers:", JSON.stringify(res.headers, null, 2));
        }).catch(() => {});

        result.steps.then((steps) => {
          for (const step of steps) {
            console.log("[chat] raw response body:", JSON.stringify(step.response.body, null, 2));
          }
        }).catch(() => {});

        result.usage.then((usage) => {
          console.log("[chat] token usage:", JSON.stringify(usage));
        }).catch(() => {});

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

    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
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

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
