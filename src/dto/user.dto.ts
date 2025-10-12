import { z } from "zod";

/** === Reglas reutilizables === */
export const PasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), {
    message: "La contraseña debe contener letras y números",
  });

export const EmailSchema = z
  .string()
  .email("Email inválido")
  .transform((s) => s.trim().toLowerCase());

export const NameSchema = z
  .string()
  .min(1, "Nombre requerido")
  .max(60, "Máximo 60 caracteres")
  .transform((s) => s.trim());

/** === ENTRADA (REQUEST) === */
export const UserRegisterDto = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: NameSchema,
}).strict();

export const UserLoginDto = z.object({
  email: EmailSchema,
  password: PasswordSchema, // si prefieres permitir cualquier string aquí, cámbialo por z.string().min(1)
}).strict();

export const UserUpdateDto = z.object({
  name: NameSchema.optional(),
}).strict();

/** === SALIDA (RESPONSE) === */
export const UserPublicDto = z.object({
  id: z.string(),
  email: EmailSchema, // ya normalizado
  name: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
}).strict();
export type UserPublic = z.infer<typeof UserPublicDto>;

/** Acepta Document o objeto plano; si hay .toJSON, lo usa */
export function toUserPublic(input: any): UserPublic {
  const src = (input && typeof input.toJSON === "function") ? input.toJSON() : input;
  const shaped = {
    id: String(src?.id ?? src?._id),
    email: src?.email,
    name: src?.name,
    createdAt: src?.createdAt,
    updatedAt: src?.updatedAt,
  };
  return UserPublicDto.parse(shaped);
}
