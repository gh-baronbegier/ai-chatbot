import "server-only";

import { neon } from "@neondatabase/serverless";

// biome-ignore lint: Forbidden non-null assertion.
const sql = neon(process.env.POSTGRES_URL!);

export type FastChatPage = {
  chat: { id: string; title: string; userId: string } | null;
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
 * Single-query fetch for chat metadata + paginated messages.
 * Uses raw SQL to collapse 3 Neon round-trips into 1.
 */
export async function getChatMessagesPageFast({
  chatId,
  limit,
  beforeId,
}: {
  chatId: string;
  limit: number;
  beforeId?: string;
}): Promise<FastChatPage> {
  if (beforeId) {
    const rows = await sql`
      WITH cursor AS (
        SELECT "createdAt" FROM "Message_v2" WHERE id = ${beforeId}::uuid LIMIT 1
      ),
      msgs AS (
        SELECT m.id, m."chatId", m.role, m.parts, m.attachments, m."createdAt"
        FROM "Message_v2" m, cursor c
        WHERE m."chatId" = ${chatId}
          AND m."createdAt" < c."createdAt"
        ORDER BY m."createdAt" DESC
        LIMIT ${limit}
      ),
      has_more AS (
        SELECT EXISTS (
          SELECT 1 FROM "Message_v2" m, cursor c
          WHERE m."chatId" = ${chatId}
            AND m."createdAt" < c."createdAt"
          OFFSET ${limit}
        ) AS v
      )
      SELECT
        c.id   AS chat_id,
        c.title AS chat_title,
        c."userId" AS chat_user_id,
        m.id   AS msg_id,
        m.role AS msg_role,
        m.parts AS msg_parts,
        m.attachments AS msg_attachments,
        m."createdAt" AS msg_created_at,
        hm.v   AS has_more
      FROM "Chat" c
      LEFT JOIN msgs m ON true
      LEFT JOIN has_more hm ON true
      WHERE c.id = ${chatId}
      ORDER BY m."createdAt" DESC
    `;

    return parseRows(rows, chatId);
  }

  // Recent messages (no cursor)
  const rows = await sql`
    WITH msgs AS (
      SELECT id, "chatId", role, parts, attachments, "createdAt"
      FROM "Message_v2"
      WHERE "chatId" = ${chatId}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    ),
    has_more AS (
      SELECT EXISTS (
        SELECT 1 FROM "Message_v2"
        WHERE "chatId" = ${chatId}
        OFFSET ${limit}
      ) AS v
    )
    SELECT
      c.id   AS chat_id,
      c.title AS chat_title,
      c."userId" AS chat_user_id,
      m.id   AS msg_id,
      m.role AS msg_role,
      m.parts AS msg_parts,
      m.attachments AS msg_attachments,
      m."createdAt" AS msg_created_at,
      hm.v   AS has_more
    FROM "Chat" c
    LEFT JOIN msgs m ON true
    LEFT JOIN has_more hm ON true
    WHERE c.id = ${chatId}
    ORDER BY m."createdAt" DESC
  `;

  return parseRows(rows, chatId);
}

function parseRows(rows: Record<string, unknown>[], chatId: string): FastChatPage {
  if (rows.length === 0) {
    return { chat: null, messages: [], hasMore: false };
  }

  const first = rows[0];
  const chat = first.chat_id
    ? {
        id: first.chat_id as string,
        title: first.chat_title as string,
        userId: first.chat_user_id as string,
      }
    : null;

  const hasMore = Boolean(first.has_more);

  // Filter out rows where there's no message (LEFT JOIN produced nulls)
  const messages = rows
    .filter((r) => r.msg_id != null)
    .map((r) => ({
      id: r.msg_id as string,
      chatId,
      role: r.msg_role as string,
      parts: r.msg_parts,
      attachments: r.msg_attachments,
      createdAt: new Date(r.msg_created_at as string),
    }));

  return { chat, messages, hasMore };
}
