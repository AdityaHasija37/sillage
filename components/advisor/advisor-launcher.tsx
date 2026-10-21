"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AdvisorPanel } from "./advisor-panel";

/** Opens the optional advisor from any app screen (D-001: dashboard-first, chat optional). */
export function AdvisorLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Sparkles aria-hidden="true" />
        Ask the advisor
      </DialogTrigger>
      <DialogContent
        className="top-0 right-0 left-auto flex h-dvh max-h-dvh w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-lg data-open:slide-in-from-right data-open:zoom-in-100"
        showCloseButton
      >
        <div className="border-b px-5 pt-5 pb-4">
          <DialogTitle className="font-heading text-xl">Advisor</DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            AI-generated answers grounded in your collection and Sillage&apos;s recommendation engine. They can be wrong; nothing is saved without your confirmation.
          </DialogDescription>
        </div>
        <AdvisorPanel />
      </DialogContent>
    </Dialog>
  );
}
