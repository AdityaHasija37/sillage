# Eval report

Generated 2026-10-27T08:07:27.667Z (label: `v7-ux`, engine rec-1.3). Produced by `npm run evals`; numbers are measured, not targets.

| Area | Result |
|---|---|
| Catalog size | 38,365 fragrances; 100.0% of 20 common bottles found by name; median search 12 ms (local) |
| Offer matching (61 adversarial pairs) | precision of "exact" 100.0%, recall 100.0%, three-way agreement 95.1% |
| Recommendations (32 synthetic personas) | 29/32 pass every criterion; exclusion compliance 100.0%; relevance checks 94.6%; median 16.2 ms over 3,000 candidates |
| Grounding | 0 of 7 planted fake ids/prices reached the user |
| Collection Intelligence (PRD 08 fixtures) | 9/9 checks pass |
| Live agent | no GEMINI_API_KEY or ANTHROPIC_API_KEY set; live agent eval skipped |

## Offer disagreements

| Target | Listing | Expected | Got | Reasons |
|---|---|---|---|---|
| khamrah-100 | Lattafa Khamrah Qahwa Eau de Parfum 100 ml | rejected | probable | unrecognised_words |
| 1m-edt-100 | Paco Rabanne 1 Million Lucky Eau de Toilette 100 ml | rejected | probable | unrecognised_words |
| lveb-edp-100 | Lancome La Vie Est Belle Intensement EDP 100 ml | rejected | probable | unrecognised_words |

## Collection Intelligence checks

| Check | What | Result |
|---|---|---|
| CS-01 | empty shelf has no score | pass |
| CS-small | one bottle is provisional and low confidence | pass |
| CS-02 | same shelf, any order, same score | pass |
| CS-size | 20 fresh/aquatic bottles score lower diversity than 6 mixed | pass (24 vs 85) |
| CS-03 | missing metadata excluded and reweighted, low confidence | pass |
| CS-04 | previewing an owned bottle is a duplicate | pass |
| DS-01/04 | owned-only, unique, avoid list honoured, 2+ factors across 15 contexts | pass (15/15) |
| SL-02 | A/B equals B/A and scores stay 0–100 for all 15 demo pairs | pass (15/15) |
| SL-sense | a classic complement (Tobacco Vanille + Jazz Club) beats a tension pair (Tobacco Vanille + Acqua di Gio) | pass (90 vs 51) |

## Recommendation cases

| Case | Persona | Result | Failed checks | Top 3 |
|---|---|---|---|---|
| S01 | Fresh-blue fan who loves Bleu de Chanel EDP | pass | – | Armaf Club de Nuit Blue Iconic; French Avenue Zenith Deep; Armaf Club De Nuit Urban Elixir |
| S02 | Loves Tobacco Vanille, likes Jazz Club | **fail** | an annotated good answer in top 5 | Maison Alhambra Tobacco Touch; Franck Boclet Tobacco; Argos Triumph Of Bacchus |
| S03 | Loves La Vie Est Belle, prefers women's and unisex | **fail** | an annotated good answer in top 5 | La Rive Queen of Life; Chloé Nomade Naturelle Eau de Parfum; PARIS CORNER Khair Confection |
| S04 | Loves Aventus | pass | – | Armaf Club de Nuit Intense Man Parfum; Afnan Supremacy Silver; Tiziana Terenzi Orion |
| S05 | Loves Light Blue and Acqua di Gioia | pass | – | Xerjoff XJ 1861 Renaissance; Roja Dove Isola Blu; Profumum Roma Acqua Viva |
| S06 | Niche woody fan: Santal 33 and Gypsy Water | pass | – | Chanel Bleu de Chanel Parfum; Zara Energetically New York Elixir; Creed Bois du Portugal |
| S07 | Loves Encre Noire (dark vetiver) | pass | – | Chanel Sycomore Eau de Parfum; Marc-Antoine Barrois Encelade; Maison Alhambra Anchor Black |
| S08 | Five designer bottles, none rated yet | pass | – | Armaf Club De Nuit Urban Elixir; Afnan Historic Olmeda; French Avenue Zenith Blue |
| S09 | Leather lover who avoids oud | pass | – | Maison Alhambra Amber & Leather; Tom Ford Tuscan Leather; French Avenue Scorpio |
| S10 | Loves Baccarat Rouge 540 but has a $100 budget | pass | – | Armaf Club de Nuit Untold; Natura Essencial Único; Ajmal Amber Wood |
| S11 | Added in v3 for Q-01: loves Tobacco Vanille, wants originals only (no budget alternatives) | **fail** | an annotated good answer in top 5 | Franck Boclet Tobacco; Argos Triumph Of Bacchus; Viktor&Rolf Spicebomb Extreme |
| S12 | Added in v3 for Q-01: loves Aventus, budget alternatives on (default) | pass | – | Afnan Supremacy Silver; Armaf Club de Nuit Intense Man Parfum; Tiziana Terenzi Orion |
| D01 | All-fresh blue collection wants something new | pass | – | Montale Oud Tobacco; Roja Dove Enigma Pour Homme; Xerjoff Pikovaya Dama 2018 |
| D02 | Sweet-gourmand collection wants a change | pass | – | Amouage Guidance; Mancera Red Tobacco Intense; BDK Parfums Gris Charnel Extrait |
| D03 | UX doc Flow C: woody winter scent under $150, unlike what they own | pass | – | Aramis Aramis; Montblanc Explorer Extreme; Lalique Encre Noire A L'Extreme |
| D04 | Men's-marketed only, avoids oud | pass | – | Gisada Ambassador Intense; Orto Parisi Terroni; Roja Dove Enigma Pour Homme |
| D05 | Wants something new that features iris | pass | – | Chanel Chance Eau de Toilette; Ex Nihilo Blue Talisman Extrait de Parfum; Dior Dior Homme Intense 2007 |
| D06 | Owns just one bottle | pass | – | Roja Dove Enigma Pour Homme; Amouage Interlude Man; Amouage Interlude Black Iris |
| D07 | Heavy woody-amber shelf wants a change | pass | – | Dior Dior Homme Intense 2007; Nishane Nefs; Dior Sauvage Elixir |
| D08 | Something new for daytime under $60 | pass | – | Lattafa Perfumes Khamrah Waha; Rasasi Hawas Tropical; Lattafa Perfumes Angham |
| D09 | Floral collection, women's and unisex only | pass | – | Frederic Malle Editions de Parfums The Moon; Al Haramain Perfumes Amber Oud Gold Edition; Dior Dior Addict Eau de Parfum |
| D10 | Wants a long-lasting change | pass | – | Estée Lauder Beautiful; Creed Royal Oud; Prada Infusion d'Homme |
| G01 | Summer-only fresh collection | pass | – | Nishane Nefs; Amouage Interlude Black Iris; Orto Parisi Terroni |
| G02 | Winter-only cozy collection | pass | – | Rasasi Hawas Tropical; Jean Paul Gaultier Le Beau Paradise Garden; Kenzo Kenzo Homme Marine |
| G03 | Balanced shelf within the families they like: no real gap | pass | – | Montale Black Aoud; Amouage Guidance 46; Louis Vuitton Attrape-Rêves |
| G04 | Two bottles: too few to call anything missing | pass | – | Maison Francis Kurkdjian Oud Satin Mood Extrait de Parfum; Maison Crivelli Oud Stallion; Dior Dior Homme Parfum |
| G05 | Fresh shelf, avoids oud | pass | – | Orto Parisi Terroni; Amouage Guidance 46; Amouage Purpose 50 |
| G06 | Gap filling on a $50 budget | pass | – | Rasasi Shuhrah Pour Homme; Ted Lapidus Lapidus Pour Homme; Rasasi La Yuqawam Homme |
| G07 | Evening-only shelf needs a daytime scent | pass | – | Rasasi Hawas Ice; French Avenue Vulcan Feu; Jean Paul Gaultier Le Beau Paradise Garden |
| G08 | Feminine floral-gourmand shelf, women's and unisex only | pass | – | Maison Crivelli Oud Maracujá; Roja Dove Diaghilev; Nishane Hacivat |
| G09 | Winter shelf asks explicitly for summer | pass | – | Rasasi Hawas Tropical; Jean Paul Gaultier Le Beau Paradise Garden; Kenzo Kenzo Homme Marine |
| G10 | Aquatic-only shelf | pass | – | Orto Parisi Terroni; Afnan 9 PM Night Out; Roja Dove Enigma Pour Homme |
