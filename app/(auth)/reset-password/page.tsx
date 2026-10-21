import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { ResetRequestForm } from "../auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      <ResetRequestForm />
    </AuthCard>
  );
}
