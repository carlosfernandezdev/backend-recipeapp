import { Router } from "express";
import { verifyAccess } from "../middlewares/auth";
import {
  createRecipeCtrl,
  deleteRecipeCtrl,
  getRecipeCtrl,
  listRecipesCtrl,
  updateRecipeCtrl,
} from "../controllers/recipe.controller";

const router = Router();

router.use(verifyAccess); // todas requieren auth

// Listado (orden alfabético) y creación
router.get("/", (req, res, next) => listRecipesCtrl(req, res).catch(next));
router.post("/", (req, res, next) => createRecipeCtrl(req, res).catch(next));

// Obtener / editar / borrar por id
router.get("/:id", (req, res, next) => getRecipeCtrl(req, res).catch(next));
router.patch("/:id", (req, res, next) => updateRecipeCtrl(req, res).catch(next));
router.delete("/:id", (req, res, next) => deleteRecipeCtrl(req, res).catch(next));

export default router;
