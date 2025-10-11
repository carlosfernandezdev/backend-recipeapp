import { Request, Response } from "express";
import { CreateRecipeDTO, UpdateRecipeDTO, ListQueryDTO } from "../dto/recipe.dto";
import { createRecipe, deleteRecipe, getRecipeById, listRecipes, updateRecipe } from "../service/recipe.service";

export async function createRecipeCtrl(req: Request, res: Response) {
  const parsed = CreateRecipeDTO.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "ValidationError", issues: parsed.error.issues });
  }
  const ownerId = (req as any).user.id as string;
  const recipe = await createRecipe(ownerId, parsed.data as any);
  return res.status(201).json({ recipe });
}

export async function getRecipeCtrl(req: Request, res: Response) {
  const ownerId = (req as any).user.id as string;
  const { id } = req.params;
  const recipe = await getRecipeById(ownerId, id);
  return res.status(200).json({ recipe });
}

export async function updateRecipeCtrl(req: Request, res: Response) {
  const parsed = UpdateRecipeDTO.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: "ValidationError", issues: parsed.error.issues });
  }
  const ownerId = (req as any).user.id as string;
  const { id } = req.params;
  const recipe = await updateRecipe(ownerId, id, parsed.data as any);
  return res.status(200).json({ recipe });
}

export async function deleteRecipeCtrl(req: Request, res: Response) {
  const ownerId = (req as any).user.id as string;
  const { id } = req.params;
  const result = await deleteRecipe(ownerId, id);
  return res.status(200).json(result);
}

export async function listRecipesCtrl(req: Request, res: Response) {
  const ownerId = (req as any).user.id as string;
  const parsed = ListQueryDTO.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ error: "ValidationError", issues: parsed.error.issues });
  }
  const data = await listRecipes(ownerId, parsed.data);
  return res.status(200).json(data);
}
