import type { InferSelectModel } from "drizzle-orm";
import {
  foreignKey,
  index,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable(
  "Chat",
  {
    id: text("id").primaryKey().notNull(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    idx_chat_userId: index("idx_chat_userId").on(table.userId),
  })
);

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable(
  "Message_v2",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: text("chatId")
      .notNull()
      .references(() => chat.id),
    role: varchar("role").notNull(),
    parts: json("parts").notNull(),
    attachments: json("attachments").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    idx_message_v2_chatId_createdAt: index("idx_message_v2_chatId_createdAt").on(
      table.chatId,
      table.createdAt
    ),
  })
);

export type DBMessage = InferSelectModel<typeof message>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: text("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
    idx_stream_chatId: index("idx_stream_chatId").on(table.chatId),
  })
);

export type Stream = InferSelectModel<typeof stream>;
