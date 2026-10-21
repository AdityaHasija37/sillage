import type { Metadata } from "next";
import { AuthCard } from "../../auth-card";
import { NewPasswordForm } from "../../auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function UpdatePasswordPage() {
  return (
    <AuthCard title="Choose a new password">
      <NewPasswordForm />
    </AuthCard>
  );
}
