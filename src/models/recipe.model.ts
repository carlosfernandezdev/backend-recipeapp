import { Schema, model, Document, Model, Types } from "mongoose";
import { toSlug } from "../utils/normalize";

export interface IIngredient {
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
}

export interface IRecipe extends Document {
  owner: Types.ObjectId;          // User._id
  title: string;
  titleSlug: string;              // normalizado para orden y unicidad
  description?: string;
  ingredients: IIngredient[];     // >= 1
  steps: string[];     
  servings: number;
  cookTime: number;           // >= 1
  images: string[];         // URLs de Cloudinary (secure_url)
  imagePublicIds: string[];
  tags?: string[];
  groups: Types.ObjectId[];       // Group._id[]
  createdAt: Date;
  updatedAt: Date;
}

const IngredientSchema = new Schema<IIngredient>(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: String },
    unit: { type: String },
    notes: { type: String },
  },
  { _id: false }
);

const RecipeSchema = new Schema<IRecipe>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    titleSlug: { type: String, required: true, index: true },
    description: { type: String },
    servings: { type: Number, required: true, min: 1 },
    cookTime: { type: Number, required: true, min: 1 },
    ingredients: {
      type: [IngredientSchema],
      validate: {
        validator: (v: IIngredient[]) => Array.isArray(v) && v.length > 0,
        message: "Debe incluir al menos un ingrediente.",
      },
    },
    steps: {
      type: [String],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "Debe incluir al menos un paso.",
      },
    },
    images: { type: [String], default: [] },           // NUEVO
    imagePublicIds: { type: [String], default: [] }, 
    tags: [{ type: String }],
    groups: [{ type: Schema.Types.ObjectId, ref: "Group", index: true }],
  },
  { timestamps: true }
);

// Unicidad: el mismo usuario NO puede repetir título (normalizado)
RecipeSchema.index({ owner: 1, titleSlug: 1 }, { unique: true });

// Hook: mantener titleSlug sincronizado con title
RecipeSchema.pre<IRecipe>("validate", function (next) {
  if (this.isModified("title") || !this.titleSlug) {
    this.titleSlug = toSlug(this.title);
  }
  next();
});

export const Recipe: Model<IRecipe> = model<IRecipe>("Recipe", RecipeSchema);
export default Recipe;
