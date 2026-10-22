import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { DemoShortcut } from "../demo-shortcut";
import { RegisterForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <AuthCard
        title="Start your shelf"
        subtitle="Free. Add what you own and see what it says about your taste."
      >
        <RegisterForm />
      </AuthCard>
      <DemoShortcut />
    </>
  );
}
