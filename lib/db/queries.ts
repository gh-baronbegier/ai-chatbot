import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { ChatSDKError } from "../errors";
import { generateUUID } from "../utils";
import {
  type Chat,
  chat,
  type DBMessage,
  message,
  stream,
  type User,
  user,
} from "./schema";
import { generateHashedPassword } from "./utils";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = neon(process.env.POSTGRES_URL!);
const db = drizzle({ client });

async function executeQuery<T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(errorMessage, error);
    throw new ChatSDKError("bad_request:database", errorMessage);
  }
}

export async function getUser(email: string): Promise<User[]> {
  return executeQuery(
    () => db.select().from(user).where(eq(user.email, email)),
    "Failed to get user by email"
  );
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);
  return executeQuery(
    () => db.insert(user).values({ email, password: hashedPassword }),
    "Failed to create user"
  );
}

export async function createGuestUser() {
  const email = `guest-${generateUUID()}`;
  const password = generateHashedPassword(generateUUID());
  return executeQuery(
    () =>
      db.insert(user).values({ email, password }).returning({
        id: user.id,
        email: user.email,
      }),
    "Failed to create guest user"
  );
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  return executeQuery(
    () =>
      db.insert(chat).values({
        id,
        createdAt: new Date(),
        userId,
        title,
      }),
    "Failed to save chat"
  );
}

async function deleteChatCascade(chatIds: string[]) {
  await Promise.all([
    db.delete(message).where(inArray(message.chatId, chatIds)),
    db.delete(stream).where(inArray(stream.chatId, chatIds)),
  ]);
}

export async function deleteChatById({ id }: { id: string }) {
  const result = await executeQuery(async () => {
    await deleteChatCascade([id]);
    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  }, "Failed to delete chat by id");
  return result;
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  return executeQuery(async () => {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);
    await deleteChatCascade(chatIds);

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  }, "Failed to delete all chats by user id");
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  return executeQuery(async () => {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  }, "Failed to get chats by user id");
}

export async function getChatById({ id }: { id: string }) {
  return executeQuery(async () => {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat ?? null;
  }, "Failed to get chat by id");
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  const result = await executeQuery(
    () => db.insert(message).values(messages),
    "Failed to save messages"
  );
  return result;
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  const result = await executeQuery(
    () =>
      db
        .update(message)
        .set({ parts })
        .where(eq(message.id, id))
        .returning({ chatId: message.chatId }),
    "Failed to update message"
  );
  return result;
}

export async function getRecentMessages({
  chatId,
  limit,
}: { chatId: string; limit: number }) {
  return executeQuery(
    () =>
      db
        .select()
        .from(message)
        .where(eq(message.chatId, chatId))
        .orderBy(desc(message.createdAt))
        .limit(limit),
    "Failed to get recent messages"
  );
}

export async function getMessagesBefore({
  chatId,
  beforeId,
  limit,
}: { chatId: string; beforeId: string; limit: number }) {
  const [cursor] = await db
    .select({ createdAt: message.createdAt })
    .from(message)
    .where(eq(message.id, beforeId))
    .limit(1);
  if (!cursor) return [];
  return executeQuery(
    () =>
      db
        .select()
        .from(message)
        .where(
          and(eq(message.chatId, chatId), lt(message.createdAt, cursor.createdAt))
        )
        .orderBy(desc(message.createdAt))
        .limit(limit),
    "Failed to get messages before cursor"
  );
}

export async function getMessagesByChatId({ id }: { id: string }) {
  return executeQuery(
    () =>
      db
        .select()
        .from(message)
        .where(eq(message.chatId, id))
        .orderBy(asc(message.createdAt)),
    "Failed to get messages by chat id"
  );
}

export async function getMessageById({ id }: { id: string }) {
  return executeQuery(
    () => db.select().from(message).where(eq(message.id, id)),
    "Failed to get message by id"
  );
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  const result = await executeQuery(async () => {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  }, "Failed to delete messages by chat id after timestamp");
  return result;
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  return executeQuery(
    () => db.update(chat).set({ title }).where(eq(chat.id, chatId)),
    "Failed to update chat title by id"
  );
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  return executeQuery(
    () =>
      db
        .insert(stream)
        .values({ id: streamId, chatId, createdAt: new Date() }),
    "Failed to create stream id"
  );
}
