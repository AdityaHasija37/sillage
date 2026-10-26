import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = { title: "Privacy" };

/** Plain-language privacy notice. Describes what the code actually does. */
export default function PrivacyPage() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-24 sm:px-6">
        <h1 className="text-4xl font-medium tracking-tight">Privacy</h1>
        <p className="mt-2 text-muted-foreground">How Sillage handles your information, in plain language.</p>
        <div className="mt-8 grid gap-6 text-[15px] leading-relaxed [&_h2]:mb-1 [&_h2]:font-heading [&_h2]:text-xl [&_li]:ml-5 [&_li]:list-disc">
          <section>
            <h2>What we store</h2>
            <ul>
              <li>Your account: email address, optional display name and a securely hashed password.</li>
              <li>What you enter: the fragrances you own and how you rate them, your wishlist and preferences.</li>
              <li>Recommendation runs and your relevant / not-relevant feedback, so results can be reproduced and improved.</li>
              <li>Advisor conversations: your questions, the answers and a summary of which tools ran (no secrets, no other users&apos; data).</li>
            </ul>
          </section>
          <section>
            <h2>Who can see it</h2>
            <ul>
              <li>Only you. The database enforces this with row-level security; other users can&apos;t read or change your data.</li>
              <li>When you use the advisor or Today&apos;s explanation, the relevant parts of your collection and preferences are sent to the AI provider that powers it: Google&apos;s Gemini API (free tier) or Anthropic&apos;s Claude API. Google may use free-tier requests to improve its products, so don&apos;t put anything personal in advisor questions.</li>
              <li>Price checks send only the fragrance name, concentration and size to the shopping provider, never your account details.</li>
            </ul>
          </section>
          <section>
            <h2>What we don&apos;t do</h2>
            <ul>
              <li>No ads, no tracking pixels, no selling data, no affiliate links.</li>
              <li>Rate limits use a salted fingerprint of your IP address; the address itself isn&apos;t stored.</li>
            </ul>
          </section>
          <section>
            <h2>Demo sandboxes</h2>
            <p>The one-click demo creates a private, temporary account. It and everything in it are deleted after 24 hours.</p>
          </section>
          <section>
            <h2>Deleting your data</h2>
            <p>{contact ? <>Email {contact} and your account and all its data will be deleted.</> : <>Contact the project owner via GitHub to have your account and all its data deleted.</>}</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
