import { auth } from "@/app/(auth)/auth";
import { getChatById, getRecentMessages, getMessagesBefore } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [chat, session] = await Promise.all([getChatById({ id }), auth()]);

  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const before = url.searchParams.get("before");
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("limit") ?? "30", 10) || 30, 1),
    100,
  );

  let dbMessages;

  if (before) {
    dbMessages = await getMessagesBefore({ chatId: id, beforeId: before, limit });
  } else {
    dbMessages = await getRecentMessages({ chatId: id, limit });
  }

  // DB returns DESC — reverse to chronological
  dbMessages.reverse();

  const uiMessages = convertToUIMessages(dbMessages);
  const hasMore = dbMessages.length === limit;
  const nextCursor = hasMore && uiMessages.length > 0 ? uiMessages[0].id : null;

  const isReadonly = session?.user?.id !== chat.userId;

  return Response.json({
    messages: uiMessages,
    hasMore,
    nextCursor,
    isReadonly,
  });
}
