"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/env";
import {
  loginSchema,
  newPasswordSchema,
  registerSchema,
  resetRequestSchema,
  safeNext,
} from "@/lib/validation/auth";
import { fieldErrorsOf, type ActionState } from "@/lib/validation/form";

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const values = { email: formData.get("email") };
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Confirm your email first. We sent you a link when you signed up."
        : "That email and password don't match an account.";
    return { status: "error", message, values };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  const values = { email: formData.get("email"), displayName: formData.get("displayName") };
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName || null },
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/app/add`,
    },
  });
  if (error) {
    if (error.code === "weak_password") {
      return { status: "error", fieldErrors: { password: [error.message] }, values };
    }
    return { status: "error", message: "We couldn't create your account. Try again in a moment.", values };
  }
  // When the project doesn't require email confirmation, sign-up returns a session: go straight
  // to onboarding (Flow A step 4).
  if (data.session) redirect("/app/add?welcome=1");
  // Same response whether or not the email already exists, to avoid account enumeration.
  return {
    status: "success",
    message: `Check ${parsed.data.email} for a confirmation link to finish signing up.`,
  };
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password/update`,
  });
  return {
    status: "success",
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return { status: "error", message: "This reset link has expired. Request a new one." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message =
      error.code === "same_password" ? "Choose a password you haven't used here before." : error.message;
    return { status: "error", fieldErrors: { password: [message] } };
  }
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
