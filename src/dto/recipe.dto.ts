import { z } from "zod";

export const IngredientDTO = z.object({
  name: z.string().min(1),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateRecipeDTO = z.object({
  title: z.string().min(1).max(120),
  description: z.string().optional(),
  ingredients: z.array(IngredientDTO).min(1, "Al menos 1 ingrediente"),
  steps: z.array(z.string().min(1)).min(1, "Al menos 1 paso"),
  servings: z.number().int().min(1, "Debe ser al menos 1"),
  cookTime: z.number().int().min(1, "Debe ser al menos 1"),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateRecipeDTO = z.infer<typeof CreateRecipeDTO>;

export const UpdateRecipeDTO = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().optional(),
  ingredients: z.array(IngredientDTO).min(1).optional(),
  steps: z.array(z.string().min(1)).min(1).optional(),
  servings: z.number().int().min(1).optional(),
  cookTime: z.number().int().min(1).optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
});
export type UpdateRecipeDTO = z.infer<typeof UpdateRecipeDTO>;

// Listado: personales vs generales (todas)
export const ListQueryDTO = z.object({
  scope: z.enum(["personal", "general"]).default("general"),
  q: z.string().optional(),         // buscar por título (case-insensitive)
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListQueryDTO = z.infer<typeof ListQueryDTO>;
