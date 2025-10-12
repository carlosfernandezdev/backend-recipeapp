// src/routes/group.routes.ts
import { Router } from "express";
import { verifyAccess } from "../middlewares/auth";
import {
  createGroupCtrl,
  getGroupCtrl,
  updateGroupCtrl,
  deleteGroupCtrl,
  listGroupsCtrl,
  addRecipeToGroupFromGroupCtrl,
  removeRecipeFromGroupFromGroupCtrl,
  listRecipesInGroupCtrl,
} from "../controllers/group.controller";

const router = Router();

// Todas las rutas de grupos requieren autenticación
router.use(verifyAccess);

// CRUD Grupos
router.get("/", (req, res, next) => listGroupsCtrl(req, res).catch(next));
router.post("/", (req, res, next) => createGroupCtrl(req, res).catch(next));
router.get("/:id", (req, res, next) => getGroupCtrl(req, res).catch(next));
router.patch("/:id", (req, res, next) => updateGroupCtrl(req, res).catch(next));
router.delete("/:id", (req, res, next) => deleteGroupCtrl(req, res).catch(next));

// Asociación Receta ↔ Grupo (verdad en Group.recipes[])
router.get("/:groupId/recipes", (req, res, next) => listRecipesInGroupCtrl(req, res).catch(next));
router.post("/:groupId/recipes/:id", (req, res, next) => addRecipeToGroupFromGroupCtrl(req, res).catch(next));
router.delete("/:groupId/recipes/:id", (req, res, next) => removeRecipeFromGroupFromGroupCtrl(req, res).catch(next));

export default router;
