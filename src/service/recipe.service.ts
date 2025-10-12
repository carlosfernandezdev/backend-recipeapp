import { FilterQuery, Types } from "mongoose";
import Recipe, { IRecipe } from "../models/recipe.model";
import { toSlug } from "../utils/normalize";
import { ListQueryDTO } from "../dto/recipe.dto";

export async function createRecipe(ownerId: string, data: Partial<IRecipe>) {
  // Chequeo optimista de duplicado (la DB también lo protegerá con el índice único)
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
    images: data.images ?? [],
    tags: data.tags ?? [],
    groups: [], 
  });
  return sanitize(recipe);
}

export async function getRecipeById(ownerId: string, id: string) {
  const recipe = await Recipe.findById(id);
  if (!recipe) {
    const err: any = new Error("Receta no encontrada");
    err.status = 404;
    throw err;
  }
  // Política actual: el dueño puede leer su receta; generales las listamos aparte (todas)
  // Si luego hay privacidad, aquí se valida visibilidad/ownership.
  if (String(recipe.owner) !== String(ownerId)) {
    // Por ahora permitimos leer “generales” si están en el listado general,
    // pero para /:id exigimos ownership (se puede suavizar más adelante).
    const err: any = new Error("No autorizado para ver esta receta");
    err.status = 403;
    throw err;
  }
  return sanitize(recipe);
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
  );
  if (!updated) {
    const err: any = new Error("Receta no encontrada o no autorizada");
    err.status = 404;
    throw err;
  }
  return sanitize(updated);
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
      .lean(),
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
