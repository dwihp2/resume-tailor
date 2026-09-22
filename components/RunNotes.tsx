"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchJson } from "@/lib/client";

/**
 * One textarea for the candidate's own notes — a career narrative, project
 * write-ups, old performance reviews. They are the raw material a Story can be
 * drafted from, so the answer loop starts from what the candidate already wrote
 * down instead of from a blank box (ADR-0005).
 */
export function RunNotes({ runId, notes }: { runId: string; notes: string | null }) {
  const router = useRouter();
  const [text, setText] = useState(notes ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      await patchJson(`/api/runs/${runId}`, { notes: text.trim() === "" ? null : text });
      setStatus("Saved");
      router.refresh();
    } catch (failure) {
      setStatus(failure instanceof Error ? failure.message : "Could not save those notes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details open={!notes} data-testid="notes-panel" className="rounded border border-neutral-800 p-4">
      <summary className="cursor-pointer text-sm text-neutral-400">
        Your notes {notes ? "(saved)" : "— paste what you already wrote about this work"}
      </summary>
      <div className="mt-3 space-y-2">
        <p className="text-xs text-neutral-500">
          Drafts use only these words, and you still save the answer yourself before anything is rewritten.
        </p>
        <textarea
          data-testid="notes-input"
          rows={10}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="At Rushowl I built the driver dashboard and cut manual payment handling by 20%…"
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-200"
        />
        <div className="flex items-center gap-3">
          <button
            data-testid="save-notes"
            type="button"
            disabled={busy || text === (notes ?? "")}
            onClick={save}
            className="rounded bg-emerald-500 px-3 py-2 text-sm font-medium text-emerald-950 disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save notes"}
          </button>
          {status ? (
            <span data-testid="notes-status" className="text-xs text-neutral-400">
              {status}
            </span>
          ) : null}
        </div>
      </div>
    </details>
  );
}
