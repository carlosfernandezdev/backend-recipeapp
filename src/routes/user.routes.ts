// src/routes/user.routes.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth"; // ⬅ ahora lo exporta tu auth.ts
import {
  getMe,
  patchMe,      // o updateMe (si usabas ese nombre)
  deleteMe,
} from "../controllers/user.controller"; // ajusta el path si difiere

const router = Router();

router.get("/me",    requireAuth, getMe);
router.patch("/me",  requireAuth, patchMe);   // o updateMe
router.delete("/me", requireAuth, deleteMe);

export default router;
