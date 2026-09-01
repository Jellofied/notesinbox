"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDisplayTime } from "@/lib/time";
import { compressImageFile, type CompressedAttachment } from "@/lib/image";
import type { InboxEntry } from "@/lib/types";
import {
  ImageIcon,
  InboxIcon,
  MicIcon,
  SearchIcon,
  SendIcon,
  XIcon,
} from "./icons";
import { StatusBadge } from "./status-badge";

interface SpeechRecognitionType {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export function InboxPage() {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<CompressedAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEntries = useCallback(async (query?: string) => {
    setLoadingEntries(true);
    setEntriesError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      params.set("limit", "50");
      const res = await fetch(`/api/inbox?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load entries");
      setEntries(data.entries || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load entries";
      console.error("Failed to load entries:", err);
      setEntriesError(message);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    // Initial data load on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSpeech =
        "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVoiceSupported(hasSpeech);
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearching((prev) => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") {
        setIsSearching(false);
        setSearchQuery("");
        fetchEntries();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fetchEntries]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchEntries(searchQuery);
    }, 250);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, fetchEntries]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition: SpeechRecognitionType | undefined =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionType })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionType })
        .webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      if (!results.length) return;
      const last = results[results.length - 1];
      const transcript = last[0].transcript;
      if (last.isFinal) {
        setText((prev) => {
          const separator = prev.length && !prev.endsWith(" ") ? " " : "";
          return prev + separator + transcript;
        });
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setSubmitError(null);

    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          attachments: attachments.map((a) => ({
            name: a.name,
            base64: a.dataUrl,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save capture");

      setText("");
      setAttachments([]);
      setSubmitStatus("success");
      setTimeout(() => setSubmitStatus("idle"), 1500);
      fetchEntries(searchQuery);
      textareaRef.current?.focus();
    } catch (err) {
      setSubmitStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: CompressedAttachment[] = [];
    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImageFile(file);
        newAttachments.push(compressed);
      } catch (err) {
        console.error("Image compression failed:", err);
      }
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-8 pt-safe-top sm:px-6">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-stone-50 shadow-sm">
            <InboxIcon className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Inbox
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsSearching((prev) => !prev);
            setTimeout(() => searchInputRef.current?.focus(), 0);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
          aria-label="Search inbox"
          title="Search (Ctrl+K)"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
      </header>

      {isSearching && (
        <div className="mb-4 transition-all duration-200">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search captures..."
              className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-10 pr-10 text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  fetchEntries();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                aria-label="Clear search"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-1.5 px-1 text-xs text-stone-400">
            {searchQuery ? `Searching for "${searchQuery}"` : "Press Escape to close"}
          </p>
        </div>
      )}

      <section className="rounded-3xl border border-stone-200 bg-white p-1 shadow-sm">
        <div className="rounded-[1.25rem] bg-stone-50/50 p-3 sm:p-4">
          <label htmlFor="capture" className="sr-only">
            What&apos;s on your mind?
          </label>
          <textarea
            ref={textareaRef}
            id="capture"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What&apos;s on your mind?"
            rows={3}
            className="w-full resize-none rounded-2xl border-0 bg-transparent p-3 text-lg leading-relaxed text-stone-800 placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-amber-500/20 sm:p-4"
            disabled={isSubmitting}
          />

          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 px-1">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={att.dataUrl}
                    alt="Attachment preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-stone-900/70 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 focus:opacity-100"
                    aria-label="Remove attachment"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="sr-only"
                id="image-input"
              />
              <label
                htmlFor="image-input"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-200/60 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 active:scale-95"
                title="Add image"
              >
                <ImageIcon className="h-5 w-5" />
              </label>

              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 active:scale-95 ${
                    isListening
                      ? "bg-rose-100 text-rose-600 animate-pulse"
                      : "text-stone-500 hover:bg-stone-200/60 hover:text-stone-800"
                  }`}
                  aria-label={isListening ? "Stop listening" : "Voice input"}
                  title="Voice input"
                >
                  <MicIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                (!text.trim() && attachments.length === 0)
              }
              className="flex h-12 items-center gap-2 rounded-full bg-stone-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : submitStatus === "success" ? (
                <>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  Send
                  <SendIcon className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {submitStatus === "error" && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <p className="font-medium">Couldn&apos;t save your capture</p>
          {submitError && <p className="mt-0.5 text-rose-600">{submitError}</p>}
          <p className="mt-1 text-xs text-rose-600/80">
            Your text is still in the composer — try again.
          </p>
        </div>
      )}

      {isListening && (
        <p className="mt-3 text-center text-sm text-stone-500">
          Listening… speak now
        </p>
      )}

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-stone-400">
          Recent
        </h2>

        {entriesError ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <p className="font-medium">Couldn&apos;t load captures</p>
            <p className="mt-0.5 text-rose-600">{entriesError}</p>
          </div>
        ) : loadingEntries ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-stone-200/60"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-10 text-center">
            <p className="text-stone-500">No captures yet.</p>
            <p className="mt-1 text-sm text-stone-400">
              Jot down a thought and press Send.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="group rounded-2xl border border-stone-100 bg-white p-4 shadow-sm transition hover:border-stone-200 hover:shadow"
              >
                <p className="whitespace-pre-wrap text-stone-800 leading-relaxed">
                  {entry.content || (
                    <span className="italic text-stone-400">Image capture</span>
                  )}
                </p>
                {entry.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="h-24 w-24 overflow-hidden rounded-xl border border-stone-100 bg-stone-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/attachments?path=${encodeURIComponent(att.path)}`}
                          alt="Attachment"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <StatusBadge status={entry.status} />
                  <time
                    className="text-xs text-stone-400"
                    dateTime={entry.createdAt}
                  >
                    {formatDisplayTime(entry.createdAt)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-auto pt-10 text-center text-xs text-stone-300">
        Capture now. Understand later.
      </footer>
    </div>
  );
}
