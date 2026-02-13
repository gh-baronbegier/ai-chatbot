import { auth } from "@/app/(auth)/auth";
import { getChatMessagesPageFast } from "@/lib/db/fast-chat-queries";
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

  const [data, session] = await Promise.all([
    getChatMessagesPageFast({ chatId: id, limit, beforeId: before ?? undefined }),
    auth(),
  ]);

  if (!data.chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  // DB returns DESC — reverse to chronological
  const dbMessages = [...data.messages].reverse();
  const uiMessages = convertToUIMessages(dbMessages);

  const isReadonly = session?.user?.id !== data.chat.userId;

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
