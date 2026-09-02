"use client";

import { useEffect, useRef, useState } from "react";
import { XIcon } from "./icons";

interface CreateTaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; details: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateTaskSheet({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateTaskSheetProps) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle("");
      setDetails("");
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({ title: title.trim(), details: details.trim() });
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
      <div className="relative w-full max-w-lg animate-slide-up rounded-t-[2.5rem] bg-cream p-6 pb-8 text-black shadow-2xl sm:rounded-[2.5rem]">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-black transition hover:bg-black/20"
            aria-label="Back"
          >
            <XIcon className="h-5 w-5" />
          </button>
          <span className="rounded-full bg-black/10 px-4 py-1.5 text-sm font-medium text-black">
            New Task
          </span>
        </div>

        <h2 className="mb-6 text-3xl font-semibold tracking-[-0.04em] text-black">
          Hey, Create new task
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold tracking-[-0.04em] text-black">
              Task Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full rounded-2xl border-0 bg-black/10 px-4 py-3.5 text-lg font-medium text-black placeholder:text-black/50 focus:bg-black/15 focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold tracking-[-0.04em] text-black">
              Task Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add any extra details…"
              rows={3}
              className="w-full resize-none rounded-2xl border-0 bg-black/10 px-4 py-3.5 text-lg font-medium leading-relaxed text-black placeholder:text-black/50 focus:bg-black/15 focus:outline-none focus:ring-2 focus:ring-black/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="mt-2 w-full rounded-full bg-black py-4 text-base font-semibold text-cream transition hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating…
              </span>
            ) : (
              "Create task"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
