import { Router } from "express";
import { postLogin, postRefresh, postRegister } from "../controllers/user.controller";

const router = Router();

router.post("/register", (req, res, next) => postRegister(req, res).catch(next));
router.post("/login", (req, res, next) => postLogin(req, res).catch(next));
router.post("/refresh", (req, res, next) => postRefresh(req, res).catch(next));

export default router;
