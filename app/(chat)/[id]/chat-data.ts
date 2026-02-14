import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { Redis } from "@upstash/redis";
import { getChatTail, type ChatTail } from "@/lib/db/chat-page-fast";

const CACHE_TTL_SECONDS = 3600; // 1 hour

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  });
}

function cacheKey(chatId: string): string {
  return `chat:init:${chatId}`;
}

/**
 * Fetches initial chat data (metadata + last 2 messages + hasMore) with caching.
 * Redis → getChatTail (single Neon SQL) → cache result.
 * Wrapped in React cache() so generateMetadata and the page RSC
 * share the same promise within a single request.
 */
export const getInitialChatData = cache(
  async (chatId: string): Promise<ChatTail> => {
    await connection(); // opt into request-time rendering

    const redis = getRedis();

    if (redis) {
      try {
        const cached = await redis.get<ChatTail>(cacheKey(chatId));
        if (cached) {
          return cached;
        }
      } catch {
        // Redis read failed — fall through to Neon
      }
    }

    const data = await getChatTail(chatId);

    if (redis && data.chat) {
      redis.set(cacheKey(chatId), data, { ex: CACHE_TTL_SECONDS }).catch(() => {});
    }

    return data;
  },
);
