import type { Metadata } from "next";
import { Suspense } from "react";

import { ChatSkeleton } from "../chat-skeleton";
import { getInitialChatData } from "./chat-data";
import { ChatPageRSC } from "./chat-page-rsc";

export async function generateMetadata({
  params,
}: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await getInitialChatData(id);
    const title = data.chat?.title ?? "Agent";
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
    return { title: "Agent" };
  }
}

export default function Page({
  params,
}: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatPageRSC params={params} />
    </Suspense>
  );
}
