import { Router } from "express";
import { verifyAccess } from "../middlewares/auth";
import { getMe, patchMe, deleteMe } from "../controllers/user.controller";

const router = Router();

router.get("/me", verifyAccess, (req, res, next) => getMe(req, res).catch(next));
router.patch("/me", verifyAccess, (req, res, next) => patchMe(req, res).catch(next));
router.delete("/me", verifyAccess, (req, res, next) => deleteMe(req, res).catch(next));

export default router;
