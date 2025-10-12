// src/models/user.model.ts
import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  name: string;
  bio?: string;
  password?: string;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true, trim: true },
    name:  { type: String, required: true, trim: true },

    // Usa el que tengas; ambos select:false para que no salgan por defecto
    password:     { type: String, select: false, required: false },
    passwordHash: { type: String, select: false, required: false },
  },
  {
    timestamps: true,
    versionKey: false,          // 👈 elimina __v del documento
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const r = ret as any;   // 👈 cast a any para operar sin TS error
        r.id = r._id?.toString?.();
        delete r._id;
        delete r.password;
        delete r.passwordHash;
        return r;
      },
    },
    toObject: { virtuals: true },
  }
);

export const User = model<IUser>("User", UserSchema);
export default User;
