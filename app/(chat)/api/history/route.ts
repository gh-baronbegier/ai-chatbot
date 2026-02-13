export const preferredRegion = "pdx1";

import type { NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const startingAfter = searchParams.get("starting_after");
    const endingBefore = searchParams.get("ending_before");

    if (startingAfter && endingBefore) {
      return Response.json({ chats: [], hasMore: false });
    }

    const session = await auth();
    const userId = session?.user?.id ?? "guest";

    const chats = await getChatsByUserId({
      id: userId,
      limit,
      startingAfter,
      endingBefore,
    });

    return Response.json(chats);
  } catch {
    return Response.json({ chats: [], hasMore: false });
  }
}

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id ?? "guest";

  const result = await deleteAllChatsByUserId({ userId });

  return Response.json(result, { status: 200 });
}
