import { z } from "zod";

/* ---------- AUTH ---------- */
export const RegisterDTO = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  name: z.string().min(1).max(80),
});

export type RegisterDTO = z.infer<typeof RegisterDTO>;

export const LoginDTO = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginDTO = z.infer<typeof LoginDTO>;

export const RefreshDTO = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDTO = z.infer<typeof RefreshDTO>;

/* ---------- USER PROFILE ---------- */
export const UpdateProfileDTO = z.object({
  name: z.string().min(1).max(80).optional(),
  bio: z.string().max(280).optional(),
});
export type UpdateProfileDTO = z.infer<typeof UpdateProfileDTO>;
