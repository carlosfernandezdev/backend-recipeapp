import { Router } from "express";
import { registerCtrl, loginCtrl, refreshCtrl, logoutCtrl } from "../controllers/user.controller";

const router = Router();
router.post("/register", registerCtrl);
router.post("/login",    loginCtrl);
router.post("/refresh",  refreshCtrl);
router.post("/logout",   logoutCtrl);
export default router;
