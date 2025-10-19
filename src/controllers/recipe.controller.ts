// src/controllers/recipe.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  CreateRecipeDTO,
  UpdateRecipeDTO,
  ListQueryDTO,
} from "../dto/recipe.dto";
import {
  createRecipe,
  deleteRecipe,
  getRecipeById,
  listRecipes,
  updateRecipe,
} from "../service/recipe.service";

// Si tienes un tipo AuthRequest con user.id, puedes importarlo y usarlo.
// Aquí casteamos por simplicidad.
function getOwnerId(req: Request) {
  return (req as any).user?.id as string;
}

function handleError(err: any, res: Response) {
  // Si el servicio puso err.status, respétalo.
  const status = Number(err?.status) || 500;
  if (status >= 500) {
    // Log interno para depurar (si tienes logger, úsalo aquí)
    // console.error(err);
  }
  return res.status(status).json({
    error: err?.name || "Error",
    message: err?.message || "Unexpected error",
    details: err?.details,
  });
}

export async function createRecipeCtrl(req: Request, res: Response, next?: NextFunction) {
  try {
    const parsed = CreateRecipeDTO.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(422)
        .json({ error: "ValidationError", issues: parsed.error.issues });
    }
    const ownerId = getOwnerId(req);
    const recipe = await createRecipe(ownerId, parsed.data as any);
    return res.status(201).json({ recipe });
  } catch (err) {
    // si usas .catch(next) en las rutas, puedes hacer: return next?.(err);
    return handleError(err, res);
  }
}

export async function getRecipeCtrl(req: Request, res: Response, next?: NextFunction) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;
    const recipe = await getRecipeById(ownerId, id);
    return res.status(200).json({ recipe });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function updateRecipeCtrl(req: Request, res: Response, next?: NextFunction) {
  try {
    const parsed = UpdateRecipeDTO.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(422)
        .json({ error: "ValidationError", issues: parsed.error.issues });
    }
    const ownerId = getOwnerId(req);
    const { id } = req.params;
    const recipe = await updateRecipe(ownerId, id, parsed.data as any);
    return res.status(200).json({ recipe });
  } catch (err) {
    return handleError(err, res);
  }
}

export async function deleteRecipeCtrl(req: Request, res: Response, next?: NextFunction) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;
    const result = await deleteRecipe(ownerId, id);
    return res.status(200).json(result);
  } catch (err) {
    return handleError(err, res);
  }
}

export async function listRecipesCtrl(req: Request, res: Response, next?: NextFunction) {
  try {
    const parsed = ListQueryDTO.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(422)
        .json({ error: "ValidationError", issues: parsed.error.issues });
    }
    const ownerId = getOwnerId(req);
    const data = await listRecipes(ownerId, parsed.data);
    return res.status(200).json(data);
  } catch (err) {
    return handleError(err, res);
  }
}
