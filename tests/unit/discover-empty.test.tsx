import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const discoverAction = vi.fn();
vi.mock("@/app/(app)/app/actions", () => ({
  discoverAction: (...args: unknown[]) => discoverAction(...args),
  addWishlistAction: vi.fn(),
  feedbackAction: vi.fn(),
}));

import { Discover } from "@/components/discover/discover";

describe("Discover empty state (ERR-04)", () => {
  it("names the most restrictive filter and relaxes it on request", async () => {
    discoverAction
      .mockResolvedValueOnce({ ok: true, runId: null, cards: [], globalCaveats: [], mostRestrictive: "budget", excluded: { owned: 6, dislikedNote: 0, budget: 900, season: 0, daypart: 0, lowQuality: 0, tooSimilar: 0, marketing: 0, alternatives: 0 }, considered: 3000, ownedCount: 6 })
      .mockResolvedValueOnce({ ok: true, runId: null, cards: [], globalCaveats: [], mostRestrictive: null, excluded: { owned: 6, dislikedNote: 0, budget: 0, season: 0, daypart: 0, lowQuality: 0, tooSimilar: 0, marketing: 0, alternatives: 0 }, considered: 3000, ownedCount: 6 });
    render(<Discover defaultBudget={20} ownedCount={6} initialMode="similar" />);
    fireEvent.click(screen.getByRole("button", { name: "Show suggestions" }));
    expect(await screen.findByText("No confident matches")).toBeInTheDocument();
    expect(screen.getByText(/budget removed the most options/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Relax that filter and retry" }));
    await waitFor(() => expect(discoverAction).toHaveBeenCalledTimes(2));
    expect(discoverAction.mock.calls[0][0]).toMatchObject({ budgetMax: 20 });
    expect(discoverAction.mock.calls[1][0]).toMatchObject({ budgetMax: null });
  });

  it("asks for a collection before recommending", () => {
    render(<Discover defaultBudget={null} ownedCount={0} initialMode="similar" />);
    expect(screen.getByText("Add a few fragrances first")).toBeInTheDocument();
  });
});
