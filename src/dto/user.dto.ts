import { z } from "zod";
import { IUser } from "../models/user.model";

export const UserPublicDto = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
}).strict();

export type UserPublic = z.infer<typeof UserPublicDto>;

export function toUserPublic(u: Partial<IUser> & { _id?: any; id?: any }) {
  const shaped = {
    id: String(u.id ?? u._id),
    email: u.email!,
    name: u.name!,
    createdAt: u.createdAt!,
    updatedAt: u.updatedAt!,
  };
  return UserPublicDto.parse(shaped);
}
