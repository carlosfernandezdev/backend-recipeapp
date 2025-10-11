import type { Request } from "express";
import type { Response } from "express";
import { RegisterDTO, LoginDTO, RefreshDTO, UpdateProfileDTO } from "../dto/user.dto";
import { registerUser, loginUser, refreshSession, getMyProfile, updateMyProfile, deleteMyAccount } from "../service/user.service";

export async function postRegister(req: Request, res: Response) {
  const parsed = RegisterDTO.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "ValidationError", issues: parsed.error.issues });

  const { email, password, name } = parsed.data;
  const result = await registerUser(email, password, name);
  return res.status(201).json(result);
}

export async function postLogin(req: Request, res: Response) {
  const parsed = LoginDTO.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "ValidationError", issues: parsed.error.issues });

  const { email, password } = parsed.data;
  const result = await loginUser(email, password);
  return res.status(200).json(result);
}

export async function postRefresh(req: Request, res: Response) {
  const parsed = RefreshDTO.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "ValidationError", issues: parsed.error.issues });

  const result = await refreshSession(parsed.data.refreshToken);
  return res.status(200).json(result);
}

export async function getMe(req: Request, res: Response) {
  const userId = (req as any).user?.id as string;
  const me = await getMyProfile(userId);
  return res.status(200).json({ user: me });
}

export async function patchMe(req: Request, res: Response) {
  const parsed = UpdateProfileDTO.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: "ValidationError", issues: parsed.error.issues });

  const userId = (req as any).user?.id as string;
  const updated = await updateMyProfile(userId, parsed.data);
  return res.status(200).json({ user: updated });
}

export async function deleteMe(req: Request, res: Response) {
  const userId = (req as any).user?.id as string;
  const result = await deleteMyAccount(userId);
  return res.status(200).json(result);
}
