import { notFound } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { convertToUIMessages } from "@/lib/utils";
import { getInitialChatData } from "./chat-data";
import { ChatPageClient } from "./chat-page-client";

export async function ChatPageRSC({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const data = await getInitialChatData(id);

  if (!data.chat) {
    notFound();
  }

  // DB returns DESC — reverse to chronological
  const dbMessages = [...data.messages].reverse();
  const uiMessages = convertToUIMessages(dbMessages);

  const isReadonly = session?.user?.id !== data.chat.userId;
  const nextCursor =
    data.hasMore && uiMessages.length > 0 ? uiMessages[0].id : null;

  return (
    <ChatPageClient
      id={id}
      initialMessages={uiMessages}
      isReadonly={isReadonly}
      initialHasMore={data.hasMore}
      initialHistoryCursor={nextCursor}
    />
  );
}
