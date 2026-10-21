import Link from "next/link";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

/** A Next.js link styled as a button (navigation stays a real link for keyboard and AT users). */
export function ButtonLink({ variant, size, className, ...props }: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return <Link className={buttonVariants({ variant, size, className })} {...props} />;
}
