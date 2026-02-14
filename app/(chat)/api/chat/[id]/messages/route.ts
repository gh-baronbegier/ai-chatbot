import { auth } from "@/app/(auth)/auth";
import { getChatMessagesPage } from "@/lib/db/chat-page-fast";
import { convertToUIMessages } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const url = new URL(request.url);
  const before = url.searchParams.get("before");
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("limit") ?? "30", 10) || 30, 1),
    100,
  );

  // Skip auth if no Cookie header (anonymous viewers are always readonly)
  const hasCookie = request.headers.has("cookie");
  const [data, session] = await Promise.all([
    getChatMessagesPage({ chatId: id, limit, beforeId: before ?? undefined }),
    hasCookie ? auth() : Promise.resolve(null),
  ]);

  if (!data.chatUserId) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  // Messages are already in ASC order from getChatMessagesPage
  const uiMessages = convertToUIMessages(data.messages);

  const isReadonly = session?.user?.id !== data.chatUserId;

  return Response.json(
    {
      messages: uiMessages,
      hasMore: data.hasMore,
      nextCursor: data.hasMore && uiMessages.length > 0 ? uiMessages[0].id : null,
      isReadonly,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
      },
    },
  );
}
