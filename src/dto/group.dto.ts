// src/dto/group.dto.ts
import { z } from "zod";

/** Validador simple de ObjectId */
export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Debe ser un ObjectId válido de 24 hex chars");

/** Crear Grupo */
export const CreateGroupDTO = z.object({
  name: z.string().min(1, "El nombre es requerido").max(60, "Máximo 60 caracteres"),
  description: z.string().max(280, "Máximo 280 caracteres").optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});
export type CreateGroupDTO = z.infer<typeof CreateGroupDTO>;

/** Actualizar Grupo (todos opcionales; exige al menos 1 campo) */
export const UpdateGroupDTO = z
  .object({
    name: z.string().min(1).max(60).optional(),
    description: z.string().max(280).optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Debe enviar al menos un campo a actualizar",
  });
export type UpdateGroupDTO = z.infer<typeof UpdateGroupDTO>;

/** Query: listar grupos */
export const ListGroupsQueryDTO = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListGroupsQueryDTO = z.infer<typeof ListGroupsQueryDTO>;

/** Params para asociación (rutas: /groups/:groupId/recipes/:id) */
export const GroupRecipeParamsDTO = z.object({
  groupId: objectId,
  id: objectId, // recipeId
});
export type GroupRecipeParamsDTO = z.infer<typeof GroupRecipeParamsDTO>;

/** Query para listar recetas dentro de un grupo */
export const ListRecipesInGroupQueryDTO = z.object({
  scope: z.enum(["personal", "general"]).default("general"),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListRecipesInGroupQueryDTO = z.infer<typeof ListRecipesInGroupQueryDTO>;
