import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { DemoShortcut } from "../demo-shortcut";
import { RegisterForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <AuthCard
        title="Create your account"
        subtitle="Start your collection in a couple of minutes."
      >
        <RegisterForm />
      </AuthCard>
      <DemoShortcut />
    </>
  );
}
