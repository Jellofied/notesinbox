"use client";

import { useEffect, useRef, useState } from "react";
import type { FinanceLog, FinanceType } from "@/lib/types";
import { financeMeta, financeOrder } from "./finance-colors";
import { XIcon } from "./icons";

interface FinanceFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: FinanceLog | null;
  onSubmit: (data: {
    amount: string;
    note: string;
    type: FinanceType;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function FinanceFormSheet({
  isOpen,
  onClose,
  initial,
  onSubmit,
  isSubmitting,
}: FinanceFormSheetProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<FinanceType>("expense");
  const amountRef = useRef<HTMLInputElement>(null);
  const isCreate = !initial;

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount(initial?.amount ?? "");
      setNote(initial?.note ?? "");
      setType(initial?.type ?? "expense");
      setTimeout(() => amountRef.current?.focus(), 0);
    }
  }, [isOpen, initial]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim()) return;
    await onSubmit({
      amount: amount.trim(),
      note: note.trim(),
      type,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex animate-fade-in items-end justify-center sm:items-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
      />
      <div className="relative w-full max-w-lg animate-slide-up rounded-t-[2rem] bg-black p-6 shadow-2xl sm:rounded-[2rem]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-[-0.04em] text-cream">
            {isCreate ? "New log" : "Edit log"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/10 text-cream transition hover:bg-cream/20"
            aria-label="Close"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full rounded-2xl border-0 bg-cream/10 px-4 py-3 text-lg font-medium text-cream placeholder:text-cream/50 focus:bg-cream/15 focus:outline-none focus:ring-2 focus:ring-cream/30"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            rows={3}
            className="w-full resize-none rounded-2xl border-0 bg-cream/10 px-4 py-3 text-lg font-medium leading-relaxed text-cream placeholder:text-cream/50 focus:bg-cream/15 focus:outline-none focus:ring-2 focus:ring-cream/30"
          />

          <div className="flex flex-wrap items-center gap-2">
            {financeOrder.map((t) => {
              const meta = financeMeta[t];
              const selected = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                    selected
                      ? `${meta.bg} ${meta.text}`
                      : "bg-cream/10 text-cream hover:bg-cream/20"
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !amount.trim()}
              className="w-full rounded-2xl bg-cream py-3.5 text-base font-semibold text-black transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cream/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  Saving…
                </span>
              ) : isCreate ? (
                "Create log"
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
