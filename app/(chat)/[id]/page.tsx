import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export async function generateMetadata({
  params,
}: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const chat = await getChatById({ id });
    return { title: chat?.title ?? "AI Chat" };
  } catch {
    return { title: "AI Chat" };
  }
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <ChatPage params={props.params} />
    </Suspense>
  );
}

async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chat = await getChatById({ id });

  if (!chat) {
    redirect("/");
  }

  const session = await auth();

  // TODO: Re-enable auth checks — temporarily allowing all users to view chats by URL
  // if (!session) {
  //   redirect("/api/auth/guest");
  // }

  // if (chat.visibility === "private") {
  //   if (!session.user) {
  //     return notFound();
  //   }

  //   if (session.user.id !== chat.userId) {
  //     return notFound();
  //   }
  // }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
      />
      <DataStreamHandler />
    </>
  );
}
