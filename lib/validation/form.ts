import type { z } from "zod";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: FieldErrors; values?: Record<string, unknown> }
  | { status: "success"; message?: string };

export const idle: ActionState = { status: "idle" };

export function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
