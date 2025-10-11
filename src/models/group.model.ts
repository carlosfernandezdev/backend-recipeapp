// src/models/group.model.ts
import { Schema, model, Model, Types, HydratedDocument } from "mongoose";
import { toSlug } from "../utils/normalize";              // <-- ajusta si difiere
import Recipe from "./recipe.model";                      // <-- ajusta si difiere

export interface IGroup {
  owner: Types.ObjectId;          // si usas user_id cambia a: user_id: Types.ObjectId
  name: string;
  nameSlug: string;
  description?: string;
  color?: string;
  icon?: string;
  recipes: Types.ObjectId[];      // verdad vive aquí: IDs de recetas
  createdAt: Date;
  updatedAt: Date;
}

export type GroupDocument = HydratedDocument<IGroup>;

const GroupSchema = new Schema<IGroup>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    nameSlug: { type: String, required: true, index: true },
    description: { type: String, maxlength: 280 },
    color: { type: String },
    icon: { type: String },
    recipes: [{ type: Schema.Types.ObjectId, ref: "Recipe", index: true }],
  },
  { timestamps: true }
);

// Índice único por dueño + nombre normalizado (evita duplicados)
GroupSchema.index({ owner: 1, nameSlug: 1 }, { unique: true, name: "uniq_owner_nameSlug" });

// Mantener nameSlug sincronizado
GroupSchema.pre<GroupDocument>("validate", function (next) {
  if (this.isModified("name") || !this.nameSlug) {
    this.nameSlug = toSlug(this.name);
  }
  next();
});

// Salida limpia (opcional)
GroupSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.nameSlug; // interno
  },
});

export const Group: Model<IGroup> = model<IGroup>("Group", GroupSchema);

/*============================*
 *   MÉTODOS DEL GROUP MODEL  *
 *============================*/

type ObjId = Types.ObjectId | string;

export interface ListGroupsParams {
  ownerId: ObjId;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ListRecipesInGroupParams {
  groupId: ObjId;
  scope?: "personal" | "general"; // si quieres limitar por dueño
  ownerId?: ObjId;                // requerido si scope = 'personal'
  q?: string;
  page?: number;
  limit?: number;
}

class GroupModel {
  /** Crear grupo (unicidad owner+nameSlug la aplica el índice) */
  async create(data: {
    owner: ObjId;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }) {
    const created = await Group.create({
      owner: new Types.ObjectId(data.owner),
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      recipes: [],
    });
    return created.toObject();
  }

  async getById(groupId: ObjId) {
    const g = await Group.findById(groupId).lean();
    return g || null;
  }

  async update(groupId: ObjId, patch: Partial<Pick<IGroup, "name" | "description" | "color" | "icon">>) {
    const updated = await Group.findOneAndUpdate(
      { _id: new Types.ObjectId(groupId) },
      patch,
      { new: true }
    ).lean();
    return updated || null;
  }

  /** Borrar grupo: las recetas simplemente quedan fuera (no se tocan) */
  async delete(groupId: ObjId) {
    const res = await Group.deleteOne({ _id: new Types.ObjectId(groupId) });
    return { ok: res.acknowledged === true, deletedCount: res.deletedCount ?? 0 };
  }

  /** Listar grupos del owner, ordenados alfabéticamente */
  async list({ ownerId, q, page = 1, limit = 20 }: ListGroupsParams) {
    page = Math.max(1, Number(page) || 1);
    limit = Math.max(1, Math.min(100, Number(limit) || 20));
    const filter: any = { owner: new Types.ObjectId(ownerId) };

    if (q && q.trim()) {
      filter.name = { $regex: q.trim(), $options: "i" };
    }

    const [items, totalCount] = await Promise.all([
      Group.find(filter)
        .sort({ nameSlug: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Group.countDocuments(filter),
    ]);

    return {
      data: items.map((g: any) => ({
        id: String(g._id),
        owner: String(g.owner),
        name: g.name,
        description: g.description,
        color: g.color,
        icon: g.icon,
        recipes: (g.recipes ?? []).map((r: any) => String(r)),
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      limit,
    };
  }

  /** Agregar receta al grupo (sin duplicar). No muta Recipe. */
  async addRecipeToGroup(groupId: ObjId, recipeId: ObjId) {
    const gid = new Types.ObjectId(groupId);
    const rid = new Types.ObjectId(recipeId);

    // Validar existencia básica
    const [groupDoc, recipeDoc] = await Promise.all([
      Group.findById(gid),
      Recipe.findById(rid).select("_id"), // si quieres restringir a recetas propias, añade { owner: ownerId }
    ]);
    if (!groupDoc) return { error: "Grupo no encontrado", status: 404 } as const;
    if (!recipeDoc) return { error: "Receta no encontrada", status: 404 } as const;

    const already = (groupDoc.recipes ?? []).some((id) => id.equals(rid));
    if (already) {
      const ret = await Group.findById(gid).lean();
      return { group: ret, wasAdded: false } as const;
    }

    const updated = await Group.findOneAndUpdate(
      { _id: gid },
      { $addToSet: { recipes: rid } },
      { new: true }
    ).lean();

    return { group: updated, wasAdded: true } as const;
  }

  /** Quitar receta del grupo. No muta Recipe. */
  async removeRecipeFromGroup(groupId: ObjId, recipeId: ObjId) {
    const gid = new Types.ObjectId(groupId);
    const rid = new Types.ObjectId(recipeId);

    const groupDoc = await Group.findById(gid);
    if (!groupDoc) return { error: "Grupo no encontrado", status: 404 } as const;

    const present = (groupDoc.recipes ?? []).some((id) => id.equals(rid));
    if (!present) {
      const ret = await Group.findById(gid).lean();
      return { group: ret, wasRemoved: false } as const;
    }

    const updated = await Group.findOneAndUpdate(
      { _id: gid },
      { $pull: { recipes: rid } },
      { new: true }
    ).lean();

    return { group: updated, wasRemoved: true } as const;
  }

  /** Listar recetas de un grupo (orden alfabético por titleSlug) */
  async listRecipesInGroup({ groupId, scope = "general", ownerId, q, page = 1, limit = 20 }: ListRecipesInGroupParams) {
    page = Math.max(1, Number(page) || 1);
    limit = Math.max(1, Math.min(100, Number(limit) || 20));

    const gid = new Types.ObjectId(groupId);
    const g = await Group.findById(gid).select("recipes").lean();
    if (!g) {
      return { data: [], totalCount: 0, totalPages: 0, currentPage: page, limit };
    }

    const recipeIds: Types.ObjectId[] = (g.recipes ?? []).map((rid: any) => new Types.ObjectId(String(rid)));
    if (recipeIds.length === 0) {
      return { data: [], totalCount: 0, totalPages: 0, currentPage: page, limit };
    }

    const filter: any = { _id: { $in: recipeIds } };
    if (q && q.trim()) {
      filter.title = { $regex: q.trim(), $options: "i" };
    }
    if (scope === "personal" && ownerId) {
      filter.owner = new Types.ObjectId(ownerId); // si usas user_id, cámbialo aquí
    }

    const [items, totalCount] = await Promise.all([
      Recipe.find(filter)
        .sort({ titleSlug: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-__v")
        .lean(),
      Recipe.countDocuments(filter),
    ]);

    return {
      data: items.map((r: any) => ({
        id: String(r._id),
        owner: String(r.owner),
        title: r.title,
        description: r.description,
        ingredients: r.ingredients || [],
        steps: r.steps || [],
        images: r.images || [],
        tags: r.tags || [],
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      limit,
    };
  }
}

const groupModel = new GroupModel();
export default groupModel;
