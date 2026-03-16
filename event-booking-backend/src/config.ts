import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  BODY_SIZE_LIMIT: z.string().default("10kb"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_BOOKING_WINDOW_MS: z.coerce.number().default(60 * 1000),
  RATE_LIMIT_BOOKING_MAX: z.coerce.number().default(10),

  // Redis config for capacity accelerator
  REDIS_URL: z.string().url().optional(),
  REDIS_ENABLED: z
    .union([z.literal("true"), z.literal("false")])
    .default("true")
    .transform((v) => v === "true"),
  REDIS_DEFAULT_TTL_SECONDS: z.coerce.number().default(24 * 60 * 60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const config = Object.freeze(parsed.data);
