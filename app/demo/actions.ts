"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoEnabled, provisionDemo } from "@/lib/demo/provision";

/** "Try the demo": create a private sample collection and sign straight into it (no email, no sign-up). */
export async function startDemo() {
  if (!demoEnabled()) redirect("/register");
  const result = await provisionDemo();
  if (result.status !== "ok") redirect("/?demo=busy");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: result.email, password: result.password });
  if (error) redirect("/?demo=busy");
  redirect("/app?welcome=demo");
}
