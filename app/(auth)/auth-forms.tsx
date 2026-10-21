"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { idle } from "@/lib/validation/form";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState(signIn, idle);
  const fe = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  return (
    <form action={action} className="grid gap-4" noValidate>
      {notice && state.status === "idle" && <FormMessage state={{ status: "error", message: notice }} />}
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={str(values?.email)} errors={fe?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required errors={fe?.password} />
      <SubmitButton pendingLabel="Signing in…" size="lg">Sign in</SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/reset-password" className="text-muted-foreground underline-offset-4 hover:underline">
          Forgot password?
        </Link>
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(signUp, idle);
  if (state.status === "success") {
    return <FormMessage state={state} />;
  }
  const fe = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="Your name (optional)" name="displayName" autoComplete="name" maxLength={60} defaultValue={str(values?.displayName)} errors={fe?.displayName} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={str(values?.email)} errors={fe?.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required hint="At least 8 characters." errors={fe?.password} />
      <SubmitButton pendingLabel="Creating account…" size="lg">Create account</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordReset, idle);
  const fe = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="Email" name="email" type="email" autoComplete="email" required errors={fe?.email} />
      <SubmitButton pendingLabel="Sending…" size="lg">Send reset link</SubmitButton>
      <Link href="/login" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, idle);
  const fe = state.status === "error" ? state.fieldErrors : undefined;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" required hint="At least 8 characters." errors={fe?.password} />
      <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required errors={fe?.confirm} />
      <SubmitButton pendingLabel="Saving…" size="lg">Save new password</SubmitButton>
    </form>
  );
}
