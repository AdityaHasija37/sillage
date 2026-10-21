import { z } from "zod";

const email = z.email("Enter a valid email address.").trim().toLowerCase();
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords can be at most 72 characters.");

export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password.") });
export const registerSchema = z.object({
  displayName: z.string().trim().max(60, "Names can be at most 60 characters.").optional(),
  email,
  password,
});
export const resetRequestSchema = z.object({ email });
export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] });

/** Only allow same-site relative redirects after auth. */
export function safeNext(next: unknown, fallback = "/app"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
