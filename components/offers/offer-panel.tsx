"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ExternalLink, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { compareOffersAction, type OfferRow, type OffersResponse } from "@/app/(app)/app/actions";
import { CONCENTRATIONS, type Concentration } from "@/lib/domain/fragrance";
import { cn } from "@/lib/utils";

const CONC_LABEL: Record<Concentration, string> = { EDC: "Eau de Cologne", EDT: "Eau de Toilette", EDP: "Eau de Parfum", Parfum: "Parfum", Extrait: "Extrait de Parfum", Elixir: "Elixir", Cologne: "Cologne" };
const STANDARD_SIZES = [30, 50, 60, 75, 90, 100, 125, 150, 200];
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Flow D: pick the exact bottle, then compare. Offers are grouped and the price basis is explicit. */
export function OfferPanel({ fragranceId, concentration, knownSizes }: { fragranceId: string; concentration: Concentration | null; knownSizes: number[] }) {
  const [conc, setConc] = useState<Concentration | "">(concentration ?? "");
  const sizes = knownSizes.length ? knownSizes : STANDARD_SIZES;
  const [size, setSize] = useState<number>(sizes.includes(100) ? 100 : sizes[sizes.length - 1]);
  const [res, setRes] = useState<OffersResponse | null>(null);
  const [pending, start] = useTransition();

  return (
    <section aria-labelledby="offers-h" className="grain rounded-md border bg-card p-6 sm:p-8">
      <p className="label">Price check</p>
      <h2 id="offers-h" className="mt-1 text-4xl">
        Compare prices
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose the exact bottle. Only listings with the same concentration and size count as matches.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="conc">Concentration</Label>
          <select id="conc" value={conc} onChange={(e) => setConc(e.target.value as Concentration)} className="h-9 rounded-lg border bg-background px-2.5 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            {!concentration && <option value="">Choose…</option>}
            {CONCENTRATIONS.map((c) => (
              <option key={c} value={c}>
                {CONC_LABEL[c]}
                {c === concentration ? " (this fragrance)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="size">Size</Label>
          <select id="size" value={size} onChange={(e) => setSize(Number(e.target.value))} className="h-9 rounded-lg border bg-background px-2.5 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s} ml
              </option>
            ))}
          </select>
        </div>
        <Button
          disabled={!conc || pending}
          onClick={() =>
            start(async () => {
              setRes(await compareOffersAction({ fragranceId, concentration: conc, sizeMl: size }));
            })
          }
        >
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Compare prices
        </Button>
      </div>
      {!knownSizes.length && <p className="mt-2 text-xs text-muted-foreground">Bottle sizes for this fragrance aren&apos;t in our data; these are common sizes and may not all exist.</p>}
      {!concentration && <p className="mt-1 text-xs text-muted-foreground">The concentration isn&apos;t recorded for this fragrance. Check the bottle and choose the one you want.</p>}

      <div aria-live="polite">
        {pending && (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            Searching US offers for {conc} {size} ml…
          </p>
        )}
        {res && !pending && <Results res={res} />}
      </div>
    </section>
  );
}

function Results({ res }: { res: OffersResponse }) {
  if (!res.ok)
    return (
      <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {res.error}
      </p>
    );
  const checked = new Date(res.checkedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="mt-5 grid gap-4">
      <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", res.provider.live ? "bg-muted/50" : "border-warning/50 bg-warning/5")}>
        {res.provider.live ? <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />}
        <div>
          <p className="font-medium">
            {res.provider.live ? "Offers found from available sources" : "Sample offers, not live prices"} · {res.bottle}
          </p>
          <p className="text-muted-foreground">
            {res.notice ?? `Source: ${res.provider.label}. Not every store is checked.`} Checked {checked}
            {res.fromCache ? " (cached)" : ""}.
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-baseline gap-2 font-sans text-sm font-medium">
          Exact matches <span className="text-muted-foreground">({res.exact.length})</span>
        </h3>
        {res.exact.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">No verified offers found for this exact bottle.</p>
        ) : (
          <>
            <OfferTable rows={res.exact} basis={res.basis} live={res.provider.live} />
            <p className="mt-2 text-xs text-muted-foreground">
              {res.basis === "landed"
                ? "Sorted by price including shipping. Tax isn't included."
                : `Sorted by listed price. Shipping isn't stated for ${res.shippingUnknownCount} offer${res.shippingUnknownCount === 1 ? "" : "s"}, so totals aren't compared.`}
            </p>
          </>
        )}
      </div>

      {res.needsVerification.length > 0 && (
        <div>
          <h3 className="mb-2 font-sans text-sm font-medium">
            Needs verification <span className="text-muted-foreground">({res.needsVerification.length})</span>
          </h3>
          <OfferTable rows={res.needsVerification} basis="listed" live={res.provider.live} showReasons />
        </div>
      )}

      {res.rejected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Hidden because they aren&apos;t the same bottle: {res.rejected.map((r) => `${r.count} ${r.reason}`).join(", ")}.
        </p>
      )}
    </div>
  );
}

function OfferTable({ rows, basis, live, showReasons = false }: { rows: OfferRow[]; basis: "landed" | "listed"; live: boolean; showReasons?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-normal">
              Merchant
            </th>
            <th scope="col" className="px-3 py-2 text-right font-normal">
              Listed
            </th>
            <th scope="col" className="px-3 py-2 text-right font-normal">
              Shipping
            </th>
            {basis === "landed" && (
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Total
              </th>
            )}
            <th scope="col" className="px-3 py-2">
              <span className="sr-only">Link</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2">
                <p className="font-medium">{o.merchant}</p>
                <p className="max-w-[18rem] truncate text-xs text-muted-foreground" title={o.title}>
                  {o.title}
                </p>
                {showReasons && o.reasons.length > 0 && <p className="text-xs text-warning">{o.reasons.join(", ")}</p>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{usd(o.listPrice)}</td>
              <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{o.shippingPrice == null ? "Not stated" : o.shippingPrice === 0 ? "Free" : usd(o.shippingPrice)}</td>
              {basis === "landed" && <td className="px-3 py-2 text-right font-medium tabular-nums">{o.landed != null ? usd(o.landed) : "—"}</td>}
              <td className="px-3 py-2 text-right">
                {!live ? (
                  <span className="text-xs whitespace-nowrap text-muted-foreground">Sample, no link</span>
                ) : (
                <a href={o.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-primary hover:underline">
                  View at retailer <ExternalLink className="size-3" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
