import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model";
import { UserRegisterDto, UserLoginDto, UserUpdateDto, toUserPublic} from "../dto/user.dto";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

/** -------------------- AUTH -------------------- **/

/** POST /auth/register */
export async function registerCtrl(req: Request, res: Response) {
  const { email, password, name } = UserRegisterDto.parse(req.body);
  if (!email || !password || !name) {
    return res.status(400).json({ message: "Campos faltantes" });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(409).json({ message: "El email ya está registrado" });
  }

  const hash = await bcrypt.hash(password, 12);
  // Usa el campo que tengas en tu modelo: passwordHash o password
  const user = await User.create({ email, name, passwordHash: hash });

  const accessToken  = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, email: user.email });

  return res.status(201).json({
    user: toUserPublic(user), // filtrado (sin password)
    accessToken,
    refreshToken,             // la APK lo guarda en SecureStore
  });
}

/** POST /auth/login */
export async function loginCtrl(req: Request, res: Response) {
  const { email, password } = UserLoginDto.parse(req.body);
  if (!email || !password) {
    return res.status(400).json({ message: "Campos faltantes" });
  }

  // selecciona el hash explícitamente para comparar
  const user = await User.findOne({ email }).select("+passwordHash +password");
  if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

  const hashed = (user as any).passwordHash ?? (user as any).password;
  const ok = hashed ? await bcrypt.compare(password, hashed) : false;
  if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });

  const accessToken  = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id, email: user.email });

  return res.json({
    user: toUserPublic(user.toJSON()), // toJSON aplica remove password en el schema
    accessToken,
    refreshToken,                      // solo aquí
  });
}

/** POST /auth/refresh  -> SOLO access (no reexponemos refresh) */
export async function refreshCtrl(req: Request, res: Response) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ message: "Falta refreshToken" });

  try {
    const payload: any = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({ sub: payload.sub, email: payload.email });
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: "Refresh inválido" });
  }
}

/** POST /auth/logout  (Opción A: el cliente borra tokens; el server responde ok) */
export async function logoutCtrl(_req: Request, res: Response) {
  return res.json({ ok: true });
}

/** -------------------- USERS/ME -------------------- **/

/** GET /users/me */
export async function getMe(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: "No autorizado" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  return res.json({ user: toUserPublic(user) });
}

/** PATCH /users/me */
export async function patchMe(req, res) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: "No autorizado" });

  // antes: const { name } = req.body;
  const payload = UserUpdateDto.parse(req.body);

  const updated = await User.findByIdAndUpdate(userId, { $set: payload }, { new: true });
  if (!updated) return res.status(404).json({ message: "Usuario no encontrado" });

  return res.json({ user: toUserPublic(updated) });
}

/** DELETE /users/me  (borrar cuenta) */
export async function deleteMe(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: "No autorizado" });

  await User.findByIdAndDelete(userId);
  return res.json({ ok: true });
}
