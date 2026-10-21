import type { Metadata } from "next";
import { safeNext } from "@/lib/validation/auth";
import { AuthCard } from "../auth-card";
import { DemoShortcut } from "../demo-shortcut";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next =
    typeof params.next === "string" ? safeNext(params.next) : undefined;
  const notice =
    params.error === "link"
      ? "That link is invalid or has expired. Sign in, or request a new link."
      : undefined;
  return (
    <>
      <AuthCard
        title="Sign in"
        subtitle="Pick up where you left off with your collection."
      >
        <LoginForm next={next} notice={notice} />
      </AuthCard>
      <DemoShortcut />
    </>
  );
}
