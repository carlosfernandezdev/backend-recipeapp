import  { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";

// Tipado: inyectamos req.user
declare global {
  namespace Express {
    export interface Request {
      user?: { id: string; email?: string };
    }
  }
}

/** Middleware: exige Authorization: Bearer <accessToken> */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado" });
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: "No autorizado" });
  }

  try {
    const payload = verifyAccessToken(token) as any; // { sub, email, iat, exp, ... }
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

/** Middleware opcional: si hay token lo parsea; si no, sigue sin error */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    try {
      const payload = verifyAccessToken(token) as any;
      req.user = { id: payload.sub, email: payload.email };
    } catch {
      // ignoramos error y seguimos sin user
    }
  }
  return next();
}

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
