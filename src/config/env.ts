import * as z from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("4000"),
  MONGO_URI: z.string().min(1, "MONGO_URI es requerido"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET debe tener al menos 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET debe tener al menos 32 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  BCRYPT_ROUNDS: z.string().default("12"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
