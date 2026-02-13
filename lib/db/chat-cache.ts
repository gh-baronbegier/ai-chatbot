import "server-only";

import { Redis } from "@upstash/redis";
import { getChatMessagesPageFast, type FastChatPage } from "./fast-chat-queries";

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

export async function getChatInitialCached(
  chatId: string,
  limit = 2,
): Promise<FastChatPage> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<FastChatPage>(cacheKey(chatId));
      if (cached) {
        return cached;
      }
    } catch {
      // Redis read failed — fall through to Neon
    }
  }

  const data = await getChatMessagesPageFast({ chatId, limit });

  if (redis && data.chat) {
    redis.set(cacheKey(chatId), data, { ex: CACHE_TTL_SECONDS }).catch(() => {});
  }

  return data;
}

export function invalidateChatCache(chatId: string): void {
  const redis = getRedis();
  if (redis) {
    redis.del(cacheKey(chatId)).catch(() => {});
  }
}
