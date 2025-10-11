import bcrypt from "bcryptjs";
import { env } from "../config/env";

export async function hashPassword(plain: string) {
  const rounds = Number(env.BCRYPT_ROUNDS || 12);
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
