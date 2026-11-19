import type { LucideIcon } from "lucide-react";
import { NAV } from "@/components/app/nav-items";

/**
 * Landing-page guide to the app, one card per tab. Labels and icons come from the app's own
 * navigation, so what a visitor reads here is exactly what they'll see after signing in.
 */
const COPY: Record<(typeof NAV)[number]["label"], { title: string; body: string; when: string }> = {
  Shelf: {
    title: "See your collection at a glance",
    body: "Add the bottles you own and rate the ones you love. Your Collection Score shows how varied your shelf is, which seasons and times of day it covers, and where the gaps are.",
    when: "you want to know what your collection says about your taste.",
  },
  Today: {
    title: "Know what to wear this morning",
    body: "Pick the occasion. Sillage checks your local weather and suggests a bottle from your own shelf, with the reason it fits.",
    when: "you're standing at the shelf, undecided.",
  },
  Discover: {
    title: "Find your next bottle",
    body: "Choose Similar, Different or Fill gaps. Every pick says why it suits your taste and what's uncertain, and you can see how it would change your score before buying.",
    when: "you're ready for something new, but not another repeat.",
  },
  "Scent Lab": {
    title: "Layer what you already own",
    body: "Choose two bottles from your shelf and see how well they're likely to pair, and why. A new combination costs nothing.",
    when: "you want something different without buying anything.",
  },
  Advisor: {
    title: "Ask in plain English",
    body: "An AI assistant that knows your shelf. Ask for “a woody winter scent under $150” and it searches, ranks and explains, citing only real bottles and prices.",
    when: "your question has a few moving parts.",
  },
  Wishlist: {
    title: "Save it, then price the exact bottle",
    body: "Search 40,000+ fragrances and save one in a click. Price checks compare stores for the exact concentration and size, and set aside testers and lookalikes.",
    when: "you know what you want and need a fair price.",
  },
};

export function FeatureGuide() {
  return (
    <section id="features" aria-labelledby="features-h" className="scroll-mt-6">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div>
            <p className="label">What you can do</p>
            <h2 id="features-h" className="mt-4 text-5xl leading-[1.02]">
              Six tabs, <em className="text-primary">one shelf.</em>
            </h2>
          </div>
          <p className="max-w-lg leading-relaxed text-muted-foreground">
            Everything in Sillage starts from the bottles you own. Here&apos;s what each tab in the app is for, and when you&apos;d reach for it.
          </p>
        </div>

        <ul className="mt-12 grid gap-px overflow-hidden rounded-md border border-foreground/15 bg-foreground/15 sm:grid-cols-2 lg:grid-cols-3">
          {NAV.map((n, i) => (
            <FeatureCard key={n.href} step={i + 1} label={n.label} icon={n.icon} {...COPY[n.label]} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function FeatureCard({ step, label, icon: Icon, title, body, when }: { step: number; label: string; icon: LucideIcon; title: string; body: string; when: string }) {
  return (
    <li className="flex flex-col bg-card p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="label">
          Tab {String(step).padStart(2, "0")} · {label}
        </span>
      </div>
      <h3 className="mt-5 text-2xl leading-snug">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <p className="mt-5 border-t border-foreground/10 pt-3 text-sm">
        <span className="font-heading text-base text-primary italic">Use it when </span>
        {when}
      </p>
    </li>
  );
}

const STEPS = [
  { title: "Add a few bottles you own", body: "Search by name; typos are fine. A handful is enough to start, and more makes every tab sharper." },
  { title: "Rate the ones you love", body: "Love it, like it, or not for me. Ratings count for more than ownership, so a bottle you never wear won't steer your picks." },
  { title: "Open any tab", body: "Start with Today for a pick right now, Discover for your next bottle, or just ask the Advisor." },
];

/** Three-step start strip. The call to action is passed in so the page keeps one sample-shelf form. */
export function GetStarted({ children }: { children?: React.ReactNode }) {
  return (
    <section aria-labelledby="start-h" className="border-y border-foreground/15 bg-card/70">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="label">Getting started</p>
        <h2 id="start-h" className="mt-4 text-4xl">Up and running in three steps.</h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative md:pr-6">
              <span className="font-heading text-5xl text-primary/80 italic" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-2 text-2xl">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        {children && <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3">{children}</div>}
      </div>
    </section>
  );
}
