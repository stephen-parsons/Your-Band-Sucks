import chalk from "chalk";
import { createClient, RedisClientType } from "redis";

//1 hr in seconds
export const DEFAULT_EXPIRATION = 3600;

interface HealthCheck {
  timestap: string;
  response: string | null;
}

interface Timestamp {
  timestamp: string;
}

interface CacheItem<T> extends Timestamp {
  value: T;
}

class CacheItem<T> {
  constructor(value: T, timestamp: string) {
    this.value = value;
    this.timestamp = timestamp;
  }
}

/**
 * A singleton primary client. The modern Node Redis client
 * manages internal connection pooling and multiplexing automatically.
 */
export let client: RedisClientType | null = null;

/**
 * Starts redis by inititiating a new connection to the using a `RedisClient`.
 * Does not throw if unable to connect, only logs an error.
 * This allows the app to be started and run without redis as a fallback.
 */
export async function startRedis() {
  connectCache()
    .then(() => {
      healthCheck().then((res) => console.info("Redis Health:", res));
    })
    .catch((e) => {
      console.clear();
      console.warn(
        "⚠️ ",
        "Starting server without Redis: ",
        chalk.red(process.env.REDIS_URL),
      );
      console.error("🚨", e);
    });
}

/**
 * Create a new rediw client and connect to the cache using env `REDIS_URL`.
 * Should only be called once at startup.
 */
async function connectCache(): Promise<void> {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        // Timeout for the initial connection attempt (in milliseconds)
        connectTimeout: 10000,
        // Strategy for handling drops mid-runtime
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            // Stop retrying after 10 consecutive failures to prevent memory leaks
            return new Error("Redis reconnection attempts exhausted");
          }
          // Exponential backoff: 100ms, 200ms, 400ms, up to a max of 3000ms
          return Math.min(retries * 100, 3000);
        },
      },
    });

    // CRITICAL: Unhandled error events will crash the Node process.
    // An explicit error listener keeps the app running while Redis tries to reconnect.
    client.on("error", (err) => {
      console.error("Redis Client Error event triggered:", err);
    });

    client.on("reconnecting", () => {
      console.warn("Redis client is attempting to reconnect...");
    });

    client.on("ready", () => {
      console.log(
        "✅",
        "Redis client successfully connected and ready: ",
        chalk.green(process.env.REDIS_URL),
      );
    });
    await client.connect();
  }
}

/**
 * Pings redis with a timestamp.
 * @returns {Promise<HealthCheck>}
 */
export async function healthCheck(): Promise<HealthCheck> {
  return {
    timestap: new Date().toISOString(),
    response: client && (await client.ping()),
  };
}

/**
 * Safely sets a cache value. If Redis is down, it fails silently or logs.
 */
export async function setCacheItem<T>(key: string, value: T): Promise<boolean> {
  try {
    // Check internal readiness state before executing command
    if (!client || !client.isOpen || !client.isReady) {
      console.warn(
        `Redis not ready. Skipping CACHE_SET for key: ${chalk.cyan(key)}`,
      );
      return false;
    }

    await client.set(
      key,
      JSON.stringify(new CacheItem<T>(value, new Date().toISOString())),
      { EX: DEFAULT_EXPIRATION },
    );
    return true;
  } catch (error) {
    // Catches socket errors, command timeouts, or parsing errors
    console.error(`Failed to set cache item for ${key}:`, error);
    return false;
  }
}

/**
 * Safely gets a cache value. Returns null if Redis is unresponsive,
 * forcing the app to fall back to the primary database.
 */
export async function getCacheItem<T>(key: string): Promise<T | null> {
  try {
    if (!client || !client.isOpen || !client.isReady) {
      console.warn(
        `Redis not ready. Skipping CACHE_GET for key: ${chalk.cyan(key)}`,
      );
      return null; // Fallback to DB
    }

    const data = await client.get(key);
    return data ? (JSON.parse(data).value as T) : null;
  } catch (error) {
    console.error(`Failed to get cache item for ${key}:`, error);
    return null; // Fallback to DB
  }
}
