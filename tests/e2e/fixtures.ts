import { test as base, expect } from "@playwright/test";

/**
 * Every E2E test fails if any page hits a hydration mismatch or an uncaught error,
 * so rendering bugs can't hide behind passing assertions.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ context }, use) => {
      const errors: string[] = [];
      const watch = (page: import("@playwright/test").Page) => {
        page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
        page.on("console", (m) => {
          if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(`console: ${m.text().slice(0, 300)}`);
        });
      };
      context.pages().forEach(watch);
      context.on("page", watch);
      await use(errors);
      expect(errors, "page errors during test").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
