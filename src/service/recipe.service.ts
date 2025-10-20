import { FilterQuery, Types } from "mongoose";
import Recipe, { IRecipe } from "../models/recipe.model";
import { toSlug } from "../utils/normalize";
import { ListQueryDTO } from "../dto/recipe.dto";
import cloudinary from "../config/cloudinary";

function pickOwnerMeta(r: any) {
  // cuando usamos .lean().populate, owner es objeto; si no, es ObjectId/string
  const ownerObj = typeof r.owner === "object" ? r.owner : { _id: r.owner };
  return {
    owner: String(ownerObj._id || r.owner),
    ownerName: ownerObj.name ?? null,
    ownerEmail: ownerObj.email ?? null,
  };
}

/**
 * Crea receta (con URLs y public_ids de Cloudinary ya resueltos desde el cliente).
 * - Valida título único por owner usando titleSlug
 */
export async function createRecipe(ownerId: string, data: Partial<IRecipe>) {
  const titleSlug = toSlug(String(data.title));
  const exists = await Recipe.exists({ owner: ownerId, titleSlug });
  if (exists) {
    const err: any = new Error("Ya existe una receta con ese título");
    err.status = 409;
    throw err;
  }

  const recipe = await Recipe.create({
    owner: new Types.ObjectId(ownerId),
    title: data.title,
    titleSlug,
    description: data.description,
    ingredients: data.ingredients,
    steps: data.steps,
    servings: data.servings,
    cookTime: data.cookTime,
    images: data.images ?? [],                 // URLs (secure_url)
    imagePublicIds: (data as any).imagePublicIds ?? [], // public_id de Cloudinary
    tags: data.tags ?? [],
    groups: [],
  });

  // devolver con owner
  await recipe.populate({ path: "owner", select: "name email" });
  return sanitize(recipe as any);
}

/**  Lectura pública: cualquier usuario autenticado puede leer por id */
export async function getRecipeById(_ownerId: string, id: string) {
  const recipe = await Recipe.findById(id).populate({ path: "owner", select: "name email" });
  if (!recipe) {
    const err: any = new Error("Receta no encontrada");
    err.status = 404;
    throw err;
  }
  return sanitize(recipe as any);
}

/**
 * Actualiza receta del owner.
 * - Mantiene unicidad por titleSlug
 * - Si cambian imagePublicIds: borra en Cloudinary los public_id que quedaron fuera
 */
export async function updateRecipe(ownerId: string, id: string, data: Partial<IRecipe>) {
  // Unicidad por título (slug)
  if (data.title) {
    const titleSlug = toSlug(String(data.title));
    const conflict = await Recipe.exists({
      _id: { $ne: id },
      owner: ownerId,
      titleSlug,
    });
    if (conflict) {
      const err: any = new Error("Ya existe una receta con ese título");
      err.status = 409;
      throw err;
    }
    (data as any).titleSlug = titleSlug;
  }

  // Necesitamos comparar imagePublicIds antes del update
  const current = await Recipe.findOne({ _id: id, owner: ownerId });
  if (!current) {
    const err: any = new Error("Receta no encontrada o no autorizada");
    err.status = 404;
    throw err;
  }

  // Si vienen nuevos publicIds, eliminar de Cloudinary los que ya NO están
  if (Array.isArray((data as any).imagePublicIds)) {
    const oldSet = new Set(current.imagePublicIds || []);
    const newSet = new Set<string>((data as any).imagePublicIds);
    const toDelete = [...oldSet].filter((pid) => !newSet.has(pid));
    if (toDelete.length) {
      await Promise.allSettled(toDelete.map((pid) => cloudinary.uploader.destroy(pid)));
    }
  }

  const updated = await Recipe.findOneAndUpdate(
    { _id: id, owner: ownerId },
    data,
    { new: true }
  ).populate({ path: "owner", select: "name email" });

  if (!updated) {
    const err: any = new Error("Receta no encontrada o no autorizada");
    err.status = 404;
    throw err;
  }
  return sanitize(updated as any);
}

/**
 * Elimina receta del owner.
 * - Borra previamente todas las imágenes de Cloudinary por imagePublicIds
 */
export async function deleteRecipe(ownerId: string, id: string) {
  const doc = await Recipe.findOne({ _id: id, owner: ownerId });
  if (!doc) {
    const err: any = new Error("Receta no encontrada o no autorizada");
    err.status = 404;
    throw err;
  }

  const pids = doc.imagePublicIds || [];
  if (pids.length) {
    await Promise.allSettled(pids.map((pid) => cloudinary.uploader.destroy(pid)));
  }

  await doc.deleteOne();
  return { ok: true };
}

/** “general” = TODAS; “personal” = solo mías */
export async function listRecipes(ownerId: string, params: ListQueryDTO) {
  const { scope, q, page, limit } = params;
  const filter: FilterQuery<IRecipe> = {};

  if (scope === "personal") {
    filter.owner = new Types.ObjectId(ownerId);
  }
  if (q && q.trim()) {
    filter.title = { $regex: q.trim(), $options: "i" };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Recipe.find(filter)
      .sort({ titleSlug: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .populate({ path: "owner", select: "name email" }),
    Recipe.countDocuments(filter),
  ]);

  return {
    page,
    limit,
    total,
    items: items.map(sanitizeLean),
  };
}
/* ------------- helpers ------------- */
function sanitize(r: IRecipe | (IRecipe & { toObject?: () => any })) {
  // Si viene como Document, obtener objeto plano
  const anyR: any = (r as any)?.toObject?.() ?? r;

  const { owner, ownerName, ownerEmail } = pickOwnerMeta(anyR);

  return {
    id: String(anyR._id ?? anyR.id),
    owner,
    ownerName,
    ownerEmail,
    title: anyR.title,
    description: anyR.description,
    ingredients: anyR.ingredients ?? [],
    steps: anyR.steps ?? [],
    images: anyR.images ?? [],               // URLs
    imagePublicIds: (r as any).imagePublicIds ?? [], // public_id (quitar si no quieres exponer)
    tags: anyR.tags ?? [],
    groups: (anyR.groups ?? []).map((g: any) => String(g)),
    servings: anyR.servings,
    cookTime: anyR.cookTime,
    createdAt: anyR.createdAt,
    updatedAt: anyR.updatedAt,
    // opcional: ...pickOwnerMeta(r) si no usas populate aquí
  };
}

function sanitizeLean(r: any) {
  const { owner, ownerName, ownerEmail } = pickOwnerMeta(r);
  // r.owner podría ser objeto (por populate) u ObjectId/string
  return {
    id: String(r._id),
    owner,
    ownerName,
    ownerEmail,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients ?? [],
    steps: r.steps ?? [],
    images: r.images ?? [],
    tags: r.tags ?? [],
    groups: (r.groups ?? []).map((g: any) => String(g)),
    servings: r.servings,
    cookTime: r.cookTime,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    // opcional: ...pickOwnerMeta(r)
  };
}
