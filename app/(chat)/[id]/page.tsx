import type { Metadata } from "next";
import { connection } from "next/server";

import { getChatById } from "@/lib/db/queries";
import { ChatPageClient } from "./chat-page-client";

export async function generateMetadata({
  params,
}: { params: Promise<{ id: string }> }): Promise<Metadata> {
  await connection();
  const { id } = await params;
  try {
    const chat = await getChatById({ id });
    const title = chat?.title ?? "Agent";
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

export default async function Page({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatPageClient id={id} />;
}
