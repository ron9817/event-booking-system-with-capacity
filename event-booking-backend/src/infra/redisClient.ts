import { createClient, type RedisClientType } from "redis";
import { config } from "../config.js";
import logger from "../utils/logger.js";

let client: RedisClientType | null = null;
let connecting = false;

export function isRedisEnabled() {
  return Boolean(config.REDIS_ENABLED && config.REDIS_URL);
}

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!isRedisEnabled()) {
    return null;
  }

  if (client) {
    return client;
  }

  if (connecting) {
    // Best-effort wait for existing connection attempt
    return client;
  }

  try {
    connecting = true;
    client = createClient({
      url: config.REDIS_URL,
    });

    client.on("error", (err) => {
      logger.warn({ err }, "Redis client error");
    });

    await client.connect();
    logger.info("Redis client connected");
    return client;
  } catch (err) {
    logger.warn({ err }, "Failed to connect to Redis. Continuing without cache.");
    client = null;
    return null;
  } finally {
    connecting = false;
  }
}

