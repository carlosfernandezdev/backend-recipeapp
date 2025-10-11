import { Schema, model, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    bio: { type: String, maxlength: 280 },
  },
  { timestamps: true }
);

export const User: Model<IUser> = model<IUser>("User", UserSchema);
export default User;
