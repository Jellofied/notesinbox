"use client";

import { useEffect, useRef, useState } from "react";
import type { InboxEntry, NoteCategory } from "@/lib/types";
import { categoryMeta, categoryOrder } from "./category-colors";
import { XIcon } from "./icons";

interface NoteFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: InboxEntry | null;
  onSubmit: (data: {
    title: string;
    content: string;
    category: NoteCategory | null;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function NoteFormSheet({
  isOpen,
  onClose,
  initial,
  onSubmit,
  isSubmitting,
}: NoteFormSheetProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<NoteCategory | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isCreate = !initial;

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(initial?.title ?? "");
      setContent(initial?.content ?? "");
      setCategory(initial?.category ?? null);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isOpen, initial]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [isOpen, onClose]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [content]);

  const handleTitleChange = (value: string) => {
    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 5) {
      setTitle(value);
    } else {
      setTitle(words.slice(0, 5).join(" "));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
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
            {isCreate ? "New note" : "Edit note"}
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
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Title (optional, max 5 words)"
            className="w-full rounded-2xl border-0 bg-cream/10 px-4 py-3 text-lg font-medium text-cream placeholder:text-cream/50 focus:bg-cream/15 focus:outline-none focus:ring-2 focus:ring-cream/30"
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What&apos;s on your mind?"
            rows={3}
            className="w-full resize-none rounded-2xl border-0 bg-cream/10 px-4 py-3 text-lg font-medium leading-relaxed text-cream placeholder:text-cream/50 focus:bg-cream/15 focus:outline-none focus:ring-2 focus:ring-cream/30"
          />

          <div className="flex flex-wrap items-center gap-2">
            {categoryOrder.map((cat) => {
              const meta = categoryMeta[cat];
              const selected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(selected ? null : cat)}
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
              disabled={isSubmitting || !content.trim()}
              className="w-full rounded-2xl bg-cream py-3.5 text-base font-semibold text-black transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cream/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-400/30 border-t-stone-900" />
                  Saving…
                </span>
              ) : isCreate ? (
                "Create note"
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