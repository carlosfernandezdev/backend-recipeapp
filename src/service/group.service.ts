// src/service/group.service.ts
import { Types, FilterQuery } from "mongoose";
import { Group } from "../models/group.model";    // Asegúrate que tu file exporte: export const Group = model<IGroup>(...)
import Recipe from "../models/recipe.model";      // Ajusta la ruta/nombre si difiere
import {
  type CreateGroupDTO,
  type UpdateGroupDTO,
  type ListGroupsQueryDTO,
  type ListRecipesInGroupQueryDTO,
} from "../dto/group.dto";

/** =========================
 * Helpers
 * ======================= */
const oid = (v: string | Types.ObjectId) =>
  v instanceof Types.ObjectId ? v : new Types.ObjectId(String(v));

const sanitizeGroup = (g: any) =>
  g && {
    id: String(g._id),
    owner: String(g.owner),
    name: g.name,
    description: g.description,
    color: g.color,
    icon: g.icon,
    recipes: (g.recipes ?? []).map((r: any) => String(r)),
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };

const sanitizeRecipe = (r: any) =>
  r && {
    id: String(r._id),
    owner: String(r.owner),
    title: r.title,
    description: r.description,
    ingredients: r.ingredients ?? [],
    steps: r.steps ?? [],
    images: r.images ?? [],
    tags: r.tags ?? [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };

/** =========================
 * CRUD Groups
 * ======================= */

/** Crear grupo (owner + nameSlug es único a nivel de Schema) */
export async function createGroup(ownerId: string, data: CreateGroupDTO) {
  const created = await Group.create({
    owner: oid(ownerId),
    name: data.name,
    description: data.description,
    color: data.color,
    icon: data.icon,
    recipes: [],
  });
  return sanitizeGroup(created.toObject());
}

/** Obtener un grupo del owner */
export async function getGroup(ownerId: string, groupId: string) {
  const g = await Group.findOne({ _id: oid(groupId), owner: oid(ownerId) }).lean();
  if (!g) {
    const e: any = new Error("Grupo no encontrado");
    e.status = 404;
    throw e;
  }
  return sanitizeGroup(g);
}

/** Actualizar (name/description/color/icon). Mantiene unicidad por nameSlug en Schema. */
export async function updateGroup(ownerId: string, groupId: string, patch: UpdateGroupDTO) {
  const updated = await Group.findOneAndUpdate(
    { _id: oid(groupId), owner: oid(ownerId) },
    patch,
    { new: true }
  ).lean();
  if (!updated) {
    const e: any = new Error("Grupo no encontrado o no autorizado");
    e.status = 404;
    throw e;
  }
  return sanitizeGroup(updated);
}

/** Borrar grupo. Requisito: al borrar, las recetas solo quedan fuera (no se tocan). */
export async function deleteGroup(ownerId: string, groupId: string) {
  const res = await Group.deleteOne({ _id: oid(groupId), owner: oid(ownerId) });
  if (!res.acknowledged || !res.deletedCount) {
    const e: any = new Error("Grupo no encontrado o no autorizado");
    e.status = 404;
    throw e;
  }
  return { ok: true };
}

/** Listar grupos del owner (orden alfabético por nameSlug) */
export async function listGroups(ownerId: string, params: ListGroupsQueryDTO) {
  const { q, page = 1, limit = 20 } = params;
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 20));

  const filter: FilterQuery<any> = { owner: oid(ownerId) };
  if (q && q.trim()) filter.name = { $regex: q.trim(), $options: "i" };

  const [items, total] = await Promise.all([
    Group.find(filter).sort({ nameSlug: 1 }).skip((p - 1) * l).limit(l).lean(),
    Group.countDocuments(filter),
  ]);

  return {
    page: p,
    limit: l,
    total,
    items: items.map(sanitizeGroup),
  };
}

/** =========================
 * Asociación Receta ↔ Grupo
 * (La “verdad” vive en Group.recipes[])
 * ======================= */

/** Agregar receta a un grupo (sin duplicar) */
export async function addRecipeToGroup(ownerId: string, groupId: string, recipeId: string) {
  // Validar ownership del grupo
  const g = await Group.findOne({ _id: oid(groupId), owner: oid(ownerId) });
  if (!g) {
    const e: any = new Error("Grupo no encontrado o no autorizado");
    e.status = 404;
    throw e;
  }

  // Validar existencia de receta (si quieres restringir a recetas propias, añade { owner: oid(ownerId) })
  const r = await Recipe.findById(oid(recipeId)).select("_id").lean();
  if (!r) {
    const e: any = new Error("Receta no encontrada");
    e.status = 404;
    throw e;
  }

  // Evitar duplicado
  const already = (g.recipes ?? []).some((id: any) => id.equals(oid(recipeId)));
  if (already) {
    const lean = await Group.findById(g._id).lean();
    return { group: sanitizeGroup(lean), wasAdded: false };
  }

  const updated = await Group.findOneAndUpdate(
    { _id: g._id },
    { $addToSet: { recipes: oid(recipeId) } },
    { new: true }
  ).lean();

  return { group: sanitizeGroup(updated), wasAdded: true };
}

/** Quitar receta de un grupo */
export async function removeRecipeFromGroup(ownerId: string, groupId: string, recipeId: string) {
  // Validar ownership del grupo
  const g = await Group.findOne({ _id: oid(groupId), owner: oid(ownerId) });
  if (!g) {
    const e: any = new Error("Grupo no encontrado o no autorizado");
    e.status = 404;
    throw e;
  }

  const hasIt = (g.recipes ?? []).some((id: any) => id.equals(oid(recipeId)));
  if (!hasIt) {
    const lean = await Group.findById(g._id).lean();
    return { group: sanitizeGroup(lean), wasRemoved: false };
  }

  const updated = await Group.findOneAndUpdate(
    { _id: g._id },
    { $pull: { recipes: oid(recipeId) } },
    { new: true }
  ).lean();

  return { group: sanitizeGroup(updated), wasRemoved: true };
}

/** =========================
 * Listar recetas dentro de un grupo (orden alfabético)
 * ======================= */
export async function listRecipesInGroup(
  ownerId: string,
  groupId: string,
  params: ListRecipesInGroupQueryDTO
) {
  const { scope = "general", q, page = 1, limit = 20 } = params;
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 20));

  // Cargar grupo y validar acceso (si quieres que solo el owner vea sus grupos)
  const g = await Group.findOne({ _id: oid(groupId), owner: oid(ownerId) })
    .select("recipes owner")
    .lean();
  if (!g) {
    const e: any = new Error("Grupo no encontrado o no autorizado");
    e.status = 404;
    throw e;
  }

  const recipeIds: Types.ObjectId[] = (g.recipes ?? []).map((rid: any) => oid(rid));
  if (recipeIds.length === 0) {
    return { page: p, limit: l, total: 0, items: [] as any[] };
  }

  const filter: any = { _id: { $in: recipeIds } };
  if (q && q.trim()) filter.title = { $regex: q.trim(), $options: "i" };
  if (scope === "personal") {
    // Si “personal” debe mostrar solo recetas del mismo owner:
    filter.owner = oid(ownerId);
  }
  // scope === "general": por ahora todas; si agregas visibility, filtra aquí (visibility: 'public')

  const [items, total] = await Promise.all([
    Recipe.find(filter).sort({ titleSlug: 1 }).skip((p - 1) * l).limit(l).lean(),
    Recipe.countDocuments(filter),
  ]);

  return {
    page: p,
    limit: l,
    total,
    items: items.map(sanitizeRecipe),
  };
}
