import { Compass, FlaskConical, Heart, Library, MessageCircle, Sun } from "lucide-react";

/** The app's tabs. Shared by the in-app navigation and the landing-page feature guide, so they never drift apart. */
export const NAV = [
  { href: "/app", label: "Shelf", icon: Library, exact: true },
  { href: "/app/today", label: "Today", icon: Sun },
  { href: "/app/discover", label: "Discover", icon: Compass },
  { href: "/app/lab", label: "Scent Lab", icon: FlaskConical },
  { href: "/app/advisor", label: "Advisor", icon: MessageCircle },
  { href: "/app/wishlist", label: "Wishlist", icon: Heart },
] as const;
