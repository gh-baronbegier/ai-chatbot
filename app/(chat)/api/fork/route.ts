import { NextResponse } from "next/server";

import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, splitAtForkMessage } from "@/lib/utils";

export const preferredRegion = "pdx1";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fork = url.searchParams.get("fork");
  const until = url.searchParams.get("until");
  const msg = url.searchParams.get("msg");

  const headers = { "Cache-Control": "private, no-store" };
  const empty = { initialMessages: [] as ChatMessage[], initialInput: "", autoSendInitialInput: false };

  if (!fork) {
    return NextResponse.json(empty, { headers });
  }

  try {
    const [chat, dbMessages] = await Promise.all([
      getChatById({ id: fork }),
      getMessagesByChatId({ id: fork }),
    ]);

    if (!chat) {
      return NextResponse.json(empty, { headers });
    }

    const uiMessages = convertToUIMessages(dbMessages);

    let initialMessages: ChatMessage[] = [];
    let initialInput = "";
    let autoSendInitialInput = false;

    if (msg) {
      initialMessages = uiMessages;
      initialInput = msg;
      autoSendInitialInput = true;
    } else if (until) {
      const { history, forkMessageText } = splitAtForkMessage(uiMessages, until);
      initialMessages = history;
      initialInput = forkMessageText;
    } else {
      initialMessages = uiMessages;
    }

    return NextResponse.json(
      { initialMessages, initialInput, autoSendInitialInput },
      { headers },
    );
  } catch {
    return NextResponse.json(empty, { headers });
  }
}
