import  { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";

export function verifyAccess(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", message: "Falta Bearer token" });
  }
  const token = auth.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    (req as any).user = { id: payload.sub, email: payload.email };
    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Unauthorized", message: "Token inválido o expirado" });
  }
}
