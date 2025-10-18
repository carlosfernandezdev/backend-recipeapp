import { FilterQuery, Types } from "mongoose";
import Recipe, { IRecipe } from "../models/recipe.model";
import { toSlug } from "../utils/normalize";
import { ListQueryDTO } from "../dto/recipe.dto";

function pickOwnerMeta(r: any) {
  // cuando usamos .lean().populate, owner es objeto; si no, es ObjectId/string
  const ownerObj = typeof r.owner === "object" ? r.owner : { _id: r.owner };
  return {
    owner: String(ownerObj._id || r.owner),
    ownerName: ownerObj.name ?? null,
    ownerEmail: ownerObj.email ?? null,
  };
}


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
    images: data.images ?? [],
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

export async function updateRecipe(ownerId: string, id: string, data: Partial<IRecipe>) {
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

export async function deleteRecipe(ownerId: string, id: string) {
  const deleted = await Recipe.findOneAndDelete({ _id: id, owner: ownerId });
  if (!deleted) {
    const err: any = new Error("Receta no encontrada o no autorizada");
    err.status = 404;
    throw err;
  }
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
function sanitize(r: IRecipe) {
  return {
    id: r.id.toString(),
    owner: r.owner.toString(),
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    steps: r.steps,
    images: r.images ?? [],
    tags: r.tags ?? [],
    groups: r.groups?.map(g => g.toString()) ?? [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function sanitizeLean(r: any) {
  return {
    id: r._id.toString(),
    owner: r.owner.toString(),
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    steps: r.steps,
    images: r.images ?? [],
    tags: r.tags ?? [],
    groups: (r.groups ?? []).map((g: any) => String(g)),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
