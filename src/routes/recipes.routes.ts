// src/routes/recipes.routes.ts
import { Router } from "express";
import { verifyAccess } from "../middlewares/auth";
import {
  createRecipeCtrl,
  deleteRecipeCtrl,
  getRecipeCtrl,
  listRecipesCtrl,
  updateRecipeCtrl,
} from "../controllers/recipe.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(verifyAccess); // todas requieren auth

// Listado (orden alfabético) y creación
router.get("/", asyncHandler(listRecipesCtrl));
router.post("/", asyncHandler(createRecipeCtrl));

// Obtener / editar / borrar por id
router.get("/:id", asyncHandler(getRecipeCtrl));
router.patch("/:id", asyncHandler(updateRecipeCtrl));
router.delete("/:id", asyncHandler(deleteRecipeCtrl));

export default router;
