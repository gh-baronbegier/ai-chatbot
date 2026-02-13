import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { getChatInitialCached } from "@/lib/db/chat-cache";
import type { FastChatPage } from "@/lib/db/fast-chat-queries";

/**
 * Fetches initial chat data (metadata + recent messages) with caching.
 * Wrapped in React cache() so generateMetadata and the page RSC
 * share the same promise within a single request.
 */
export const getInitialChatData = cache(
  async (chatId: string): Promise<FastChatPage> => {
    await connection(); // opt into request-time rendering
    return getChatInitialCached(chatId);
  },
);
