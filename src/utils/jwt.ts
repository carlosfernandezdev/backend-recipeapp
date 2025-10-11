import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

type JWTPayload = { sub: string; email: string };

const accessSecret: Secret = env.JWT_ACCESS_SECRET as Secret;
const refreshSecret: Secret = env.JWT_REFRESH_SECRET as Secret;

const accessOpts: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as any };
const refreshOpts: SignOptions = { expiresIn: env.JWT_REFRESH_TTL as any };

export function signAccessToken(payload: JWTPayload) {
  return jwt.sign(payload as any, accessSecret, accessOpts);
}
export function signRefreshToken(payload: JWTPayload) {
  return jwt.sign(payload as any, refreshSecret, refreshOpts);
}
export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, accessSecret) as any;
}
export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, refreshSecret) as any;
}
