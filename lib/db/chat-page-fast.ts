import "server-only";

import { neon } from "@neondatabase/serverless";

// biome-ignore lint: Forbidden non-null assertion.
const sql = neon(process.env.POSTGRES_URL!);

export type ChatTail = {
  chat: { id: string; title: string; userId: string; createdAt: Date } | null;
  messages: Array<{
    id: string;
    chatId: string;
    role: string;
    parts: unknown;
    attachments: unknown;
    createdAt: Date;
  }>;
};

export type ChatMessagesPageResult = {
  chatUserId: string | null;
  messages: Array<{
    id: string;
    chatId: string;
    role: string;
    parts: unknown;
    attachments: unknown;
    createdAt: Date;
  }>;
  hasMore: boolean;
};

/**
 * Initial page load: ONE SQL query for chat metadata + ALL messages.
 * Full result is cached in Redis (invalidated on every write).
 * Returns messages in ASC order (chronological).
 */
export async function getChatTail(chatId: string): Promise<ChatTail> {
  const rows = await sql`
    SELECT
      c.id         AS chat_id,
      c.title      AS chat_title,
      c."userId"   AS chat_user_id,
      c."createdAt" AS chat_created_at,
      m.id         AS msg_id,
      m.role       AS msg_role,
      m.parts      AS msg_parts,
      m.attachments AS msg_attachments,
      m."createdAt" AS msg_created_at
    FROM "Chat" c
    LEFT JOIN LATERAL (
      SELECT id, role, parts, attachments, "createdAt"
      FROM "Message_v2"
      WHERE "chatId" = c.id
      ORDER BY "createdAt" ASC
    ) m ON true
    WHERE c.id = ${chatId}
    ORDER BY m."createdAt" ASC NULLS LAST
  `;

  if (rows.length === 0) {
    return { chat: null, messages: [] };
  }

  const first = rows[0];
  const chat = first.chat_id
    ? {
        id: first.chat_id as string,
        title: first.chat_title as string,
        userId: first.chat_user_id as string,
        createdAt: new Date(first.chat_created_at as string),
      }
    : null;

  const messages = rows
    .filter((r) => r.msg_id != null)
    .map((r) => ({
      id: r.msg_id as string,
      chatId,
      role: r.msg_role as string,
      parts: typeof r.msg_parts === "string" ? JSON.parse(r.msg_parts) : r.msg_parts,
      attachments: typeof r.msg_attachments === "string" ? JSON.parse(r.msg_attachments) : r.msg_attachments,
      createdAt: new Date(r.msg_created_at as string),
    }));

  return { chat, messages };
}

/**
 * Pagination query: ONE SQL query for a page of messages + hasMore.
 * Fetches limit+1 rows to determine hasMore without an extra query.
 * Returns messages in ASC order (chronological).
 */
export async function getChatMessagesPage({
  chatId,
  beforeId,
  limit,
}: {
  chatId: string;
  beforeId?: string;
  limit: number;
}): Promise<ChatMessagesPageResult> {
  if (beforeId) {
    // Cursor-based pagination: fetch messages before the cursor
    const rows = await sql`
      WITH cursor AS (
        SELECT "createdAt" FROM "Message_v2" WHERE id = ${beforeId}::uuid LIMIT 1
      )
      SELECT
        c."userId" AS chat_user_id,
        m.id       AS msg_id,
        m.role     AS msg_role,
        m.parts    AS msg_parts,
        m.attachments AS msg_attachments,
        m."createdAt" AS msg_created_at
      FROM "Chat" c
      LEFT JOIN LATERAL (
        SELECT mv.id, mv.role, mv.parts, mv.attachments, mv."createdAt"
        FROM "Message_v2" mv, cursor cur
        WHERE mv."chatId" = c.id
          AND mv."createdAt" < cur."createdAt"
        ORDER BY mv."createdAt" DESC
        LIMIT ${limit + 1}
      ) m ON true
      WHERE c.id = ${chatId}
      ORDER BY m."createdAt" ASC NULLS LAST
    `;

    return parsePageRows(rows, chatId, limit);
  }

  // No cursor: fetch most recent messages
  const rows = await sql`
    SELECT
      c."userId" AS chat_user_id,
      m.id       AS msg_id,
      m.role     AS msg_role,
      m.parts    AS msg_parts,
      m.attachments AS msg_attachments,
      m."createdAt" AS msg_created_at
    FROM "Chat" c
    LEFT JOIN LATERAL (
      SELECT id, role, parts, attachments, "createdAt"
      FROM "Message_v2"
      WHERE "chatId" = c.id
      ORDER BY "createdAt" DESC
      LIMIT ${limit + 1}
    ) m ON true
    WHERE c.id = ${chatId}
    ORDER BY m."createdAt" ASC NULLS LAST
  `;

  return parsePageRows(rows, chatId, limit);
}

function parsePageRows(
  rows: Record<string, unknown>[],
  chatId: string,
  limit: number,
): ChatMessagesPageResult {
  if (rows.length === 0) {
    return { chatUserId: null, messages: [], hasMore: false };
  }

  const chatUserId = (rows[0].chat_user_id as string) ?? null;

  const allMessages = rows
    .filter((r) => r.msg_id != null)
    .map((r) => ({
      id: r.msg_id as string,
      chatId,
      role: r.msg_role as string,
      parts: typeof r.msg_parts === "string" ? JSON.parse(r.msg_parts) : r.msg_parts,
      attachments: typeof r.msg_attachments === "string" ? JSON.parse(r.msg_attachments) : r.msg_attachments,
      createdAt: new Date(r.msg_created_at as string),
    }));

  // We fetched limit+1; if we got more than limit, there are older messages
  const hasMore = allMessages.length > limit;
  // Messages are already ASC from ORDER BY; trim the oldest (first) if over limit
  const messages = hasMore ? allMessages.slice(1) : allMessages;

  return { chatUserId, messages, hasMore };
}
