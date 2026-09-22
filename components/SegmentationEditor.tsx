"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteJson, patchJson, postEmpty, postJson } from "@/lib/client";

export type SegmentationBullet = { id: string; section: string | null; text: string };

/**
 * The step that makes everything downstream trustworthy: PDF wrapping splits
 * bullets, so the user fixes the split before anything is scored (spec
 * §Acceptance 1).
 */
export function SegmentationEditor({
  runId,
  resumeId,
  bullets,
}: {
  runId: string;
  resumeId: string;
  bullets: SegmentationBullet[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newBullet, setNewBullet] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "That did not work");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Bullets read from the PDF</h2>
        <button
          data-testid="score-bullets"
          type="button"
          disabled={busy || bullets.length === 0}
          onClick={() => run(() => postEmpty(`/api/runs/${runId}/evaluate`))}
          className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 disabled:opacity-50"
        >
          {busy ? "Working…" : "Score these bullets"}
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Fix anything the PDF wrapped, merged or dropped. Whatever survives here is what gets scored.
      </p>

      {error ? (
        <p data-testid="segmentation-error" className="rounded border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <ul data-testid="segmentation-list" className="space-y-2">
        {bullets.map((bullet, index) => (
          <li
            key={bullet.id}
            data-testid="segmentation-row"
            className="rounded border border-neutral-800 bg-neutral-900/60 p-3"
          >
            <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
              <span>{bullet.section ?? "No section"}</span>
              <span>#{index + 1}</span>
            </div>
            <textarea
              data-testid="bullet-text"
              rows={2}
              value={drafts[bullet.id] ?? bullet.text}
              onChange={(event) => setDrafts((current) => ({ ...current, [bullet.id]: event.target.value }))}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200"
            />
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <button
                data-testid="save-bullet"
                type="button"
                disabled={busy || drafts[bullet.id] === undefined || drafts[bullet.id] === bullet.text}
                onClick={() => run(() => patchJson(`/api/bullets/${bullet.id}`, { text: drafts[bullet.id] }))}
                className="rounded border border-neutral-700 px-2 py-1 disabled:opacity-40"
              >
                Save
              </button>
              <button
                data-testid="merge-bullet"
                type="button"
                disabled={busy || index === 0}
                onClick={() => run(() => postEmpty(`/api/bullets/${bullet.id}/merge`))}
                className="rounded border border-neutral-700 px-2 py-1 disabled:opacity-40"
              >
                Merge into previous
              </button>
              <button
                data-testid="move-up"
                type="button"
                disabled={busy || index === 0}
                onClick={() => run(() => patchJson(`/api/bullets/${bullet.id}`, { move: -1 }))}
                className="rounded border border-neutral-700 px-2 py-1 disabled:opacity-40"
              >
                ↑
              </button>
              <button
                data-testid="move-down"
                type="button"
                disabled={busy || index === bullets.length - 1}
                onClick={() => run(() => patchJson(`/api/bullets/${bullet.id}`, { move: 1 }))}
                className="rounded border border-neutral-700 px-2 py-1 disabled:opacity-40"
              >
                ↓
              </button>
              <button
                data-testid="drop-bullet"
                type="button"
                disabled={busy}
                onClick={() => run(() => deleteJson(`/api/bullets/${bullet.id}`))}
                className="rounded border border-red-900 px-2 py-1 text-red-300 disabled:opacity-40"
              >
                Drop
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          data-testid="add-bullet-input"
          value={newBullet}
          onChange={(event) => setNewBullet(event.target.value)}
          placeholder="Add a bullet the PDF lost"
          className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200"
        />
        <button
          data-testid="add-bullet"
          type="button"
          disabled={busy || newBullet.trim().length < 2}
          onClick={() =>
            run(async () => {
              await postJson("/api/bullets", { resumeId, text: newBullet.trim() });
              setNewBullet("");
            })
          }
          className="rounded border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </section>
  );
}
