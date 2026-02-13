import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/app/(auth)/auth";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";
import { ChatSkeleton } from "../chat-skeleton";
import { ChatPageClient } from "./chat-page-client";

export async function generateMetadata({
  params,
}: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const chat = await getChatById({ id });
    const title = chat?.title ?? "AI Chat";
    return {
      title,
      openGraph: {
        title,
        images: [`/${id}/opengraph-image`],
      },
      twitter: {
        card: "summary_large_image",
        images: [`/${id}/opengraph-image`],
      },
    };
  } catch {
    return { title: "AI Chat" };
  }
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatPage params={props.params} />
    </Suspense>
  );
}

async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Parallelize chat fetch + auth.
  const [chat, session] = await Promise.all([
    getChatById({ id }),
    auth(),
  ]);

  if (!chat) {
    redirect("/");
  }

  if (chat.visibility === "private") {
    if (!session?.user?.id || session.user.id !== chat.userId) {
      redirect("/");
    }
  }

  const messagesFromDb = await getMessagesByChatId({ id });
  const uiMessages = convertToUIMessages(messagesFromDb);

  return (
    <ChatPageClient
      id={chat.id}
      initialMessages={uiMessages}
      initialVisibilityType={chat.visibility}
      isReadonly={session?.user?.id !== chat.userId}
    />
  );
}
