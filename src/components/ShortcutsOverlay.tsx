"use client";

/**
 * Keyboard-shortcuts help overlay. Opens on "?" (when not typing in a
 * field) or by clicking the trigger. Documents the shortcuts that already
 * exist on the homepage.
 */

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["⌘", "K"], label: "Focus the search box" },
  { keys: ["Enter"], label: "Run the search" },
  { keys: ["Esc"], label: "Clear the current search" },
  { keys: ["↑", "↓"], label: "Move through recent searches" },
  { keys: ["?"], label: "Open this shortcuts panel" },
];

function isTyping(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Keyboard shortcuts"
        className="text-[var(--text-3)] hover:text-[var(--accent)] transition-colors p-1"
      >
        <Keyboard className="w-4 h-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts">
        <ul className="space-y-2.5">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4">
              <span className="font-sans text-xs text-[var(--text-2)]">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="font-mono text-[10px] text-[var(--text-2)] px-1.5 py-0.5 bg-[var(--surface2)] border border-[var(--border)] min-w-[1.4rem] text-center"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
