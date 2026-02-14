import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { getChatTail, type ChatTail } from "@/lib/db/chat-page-fast";

export const getInitialChatData = cache(
  async (chatId: string): Promise<ChatTail> => {
    await connection();
    return getChatTail(chatId);
  },
);
