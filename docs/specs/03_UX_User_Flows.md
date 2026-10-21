# 03 · Experience, User Flows & Screen Specifications

*Screen-by-screen behavior, edge states and recruiter demo experience*

Version 1.0 • 20 October 2026 • Status: build specification • Owner: independent portfolio project

Source of truth: this pack; if instructions conflict, record the decision in the Decision Register and update impacted documents. Assumptions are not verified production integrations.

## Design intent

Premium editorial visual language with restrained typography, warm ivory/charcoal/bronze accents, high-quality bottle imagery when licensed, clear hierarchy, accessible contrast, and responsive navigation. Avoid excessive dashboard analytics, generated fake reviews or gaudy perfume-shop styling. Users should discover the product’s value before signing in.

## Information architecture

Public: landing → try demo → demo dashboard → collection/details → recommendations → offers; product case study and GitHub links. Signed-in: dashboard, My Collection, Discover, Wishlist, Advisor, Profile/Settings. Use desktop left rail or top nav and compact mobile navigation. Preserve browsing context in modals and route URLs.

## Flow A — first-time onboarding

- Land on homepage with core promise and two CTAs: Try Live Demo and Create My Collection. 2. Signup or enter isolated demo. 3. Optional three-question preference input (favorite styles, dislikes, budget). 4. Search catalog by name/brand with keyboard interactions and clear loading states. 5. Add fragrances one by one; show count of owned items and suggestions to reach five without gating use. 6. Reach dashboard with real counts and clear next step “Find my next fragrance.”

## Flow B — discover next buy

- Select Similar / Different / Fill Gaps. 2. Adjust budget, season/occasion and desired performance. 3. Generate 3–5 ranked candidates from verified catalog results. 4. See product names, note/accord highlights, overlap signals, reasoning, caveats and data completeness. 5. View detail, save to wishlist, or compare prices. Empty state: explain which filter removes all candidates and offer a reversible relaxation.

## Flow C — advisor chat

- Open optional advisor panel from any signed-in or demo screen. 2. Ask “Suggest a woody winter fragrance under $50 that isn’t close to what I own.” 3. Agent reads user profile/collection and runs recommendation tools. 4. Returns specific catalog-backed candidates, compact rationale, and link to detail. 5. User can open offer comparison. AI must state when no confident data is available, and cannot silently alter user profile.

## Flow D — compare prices

- On fragrance detail select correct concentration and bottle size. 2. Trigger Compare Prices. 3. Loading state names region and timestamp; response groups Exact Matches and Needs Verification, if applicable. 4. Display merchant, listed price, shipping if known, price basis, matching confidence and Buy at Retailer external link. 5. Show when data is partial or unavailable; never fabricate price or route to a different fragrance.

## Screen-level requirements

| Screen | Key elements | Empty/error state |
|---|---|---|
| Landing | Hero value prop, product visual, guest demo CTA, GitHub/case-study | static page always works |
| Dashboard | Owned count, scent mix, season/occasion map, CTA | zero fragrances onboarding CTA |
| Collection | Grid/list, filter, search, rating, remove | no collection item guidance |
| Catalog search | Debounced query, source, paginated results | no match, provider unavailable |
| Fragrance detail | Facts, provenance, variant selector, save/add actions | missing metadata disclosure |
| Discover | Three modes, filters, ranked cards | no candidates, retry with changes |
| Advisor | Context indicator, message history, grounded links | model failure and retry |
| Wishlist | Saved fragrance cards and compare action | empty saved state |
| Offers | Exact variant, price basis, time, retailer links | partial/no offers disclosure |
| Settings | Preferences, account, demo reset | save conflict resolution |

## Demo mode specification

Demo is one click, no email, no signup. Prepopulate at least five owned fragrances across distinct styles plus one wishlist item; show a clear “Sample collection” label. Read-only or resettable sandbox, never mutate another user. Demo must allow one predictable, fast recommendation path and illustrate price comparison with LIVE data when possible or explicitly labeled sample offers. Prominent links to README, case study and GitHub. Target walkthrough duration <2 minutes.

## Microcopy principles

Say “Estimated fit” rather than “You will love this.” Say “Offers found from available sources” instead of “Cheapest anywhere.” Provide citations/source names for note information. Say “No verified offers found” rather than “Out of stock” unless vendor confirmed inventory. Disclose incomplete profiles rather than guessing preferences.

## Accessibility acceptance

Keyboard full flow: search → add → discover → shortlist → offers. Focus moves to dialogs and back; images have useful alt; icons have accessible labels; charts have textual summaries; 200% zoom no clipped CTA; interactive elements at least comfortably touch-sized; skeletons announce loading and errors.
