// src/modules/user/user.service.ts
import User, { IUser } from "../models/user.model";
import { hashPassword, comparePassword } from "../utils/crypto";
import { signAccessToken, signRefreshToken } from "../utils/jwt";

export async function registerUser(email: string, password: string, name: string) {
  const exists = await User.findOne({ email });
  if (exists) {
    const err: any = new Error("El email ya está registrado");
    err.status = 409;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, name });
  const tokens = issueTokens(user);
  return { user: sanitize(user), ...tokens };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user) {
    const err: any = new Error("Credenciales inválidas");
    err.status = 401;
    throw err;
  }
  const ok = await comparePassword(password, user.passwordHash ?? "");
  if (!ok) {
    const err: any = new Error("Credenciales inválidas");
    err.status = 401;
    throw err;
  }
  const tokens = issueTokens(user);
  return { user: sanitize(user), ...tokens };
}

export async function refreshSession(refreshToken: string) {
  // Verificación en controller para capturar errores.
  const { sub, email } = (await import("../utils/jwt")).verifyRefreshToken(refreshToken);
  const user = await User.findById(sub);
  if (!user || user.email !== email) {
    const err: any = new Error("Refresh token inválido");
    err.status = 401;
    throw err;
  }
  const tokens = issueTokens(user);
  return { user: sanitize(user), ...tokens };
}

export async function getMyProfile(userId: string) {
  const user = await User.findById(userId);
  if (!user) {
    const err: any = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }
  return sanitize(user);
}

export async function updateMyProfile(userId: string, data: Partial<Pick<IUser, "name" | "bio">>) {
  const user = await User.findByIdAndUpdate(userId, data, { new: true });
  if (!user) {
    const err: any = new Error("Usuario no encontrado");
    err.status = 404;
    throw err;
  }
  return sanitize(user);
}

export async function deleteMyAccount(userId: string) {
  await User.findByIdAndDelete(userId);
  return { ok: true };
}

/* ---------- helpers ---------- */
function issueTokens(user: IUser) {
  const payload = { sub: user.id.toString(), email: user.email };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

function sanitize(user: IUser) {
  return {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
    bio: user.bio,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
