"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteJson } from "@/lib/client";

/**
 * Runs are kept forever otherwise, and a run takes its resume, its job
 * description and every evaluation with it — so this asks once before doing it.
 */
export function DeleteRunButton({ runId, label }: { runId: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await deleteJson(`/api/runs/${runId}`);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not delete that run");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        data-testid="delete-run"
        type="button"
        title={`Delete the run for ${label}, with everything it scored and wrote`}
        onClick={() => setConfirming(true)}
        className="shrink-0 rounded border border-neutral-800 px-2 py-1 text-xs text-neutral-500 hover:border-red-900 hover:text-red-300"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-2 text-xs">
      <button
        data-testid="confirm-delete-run"
        type="button"
        disabled={busy}
        onClick={remove}
        className="rounded bg-red-900 px-2 py-1 text-red-100 disabled:opacity-40"
      >
        {busy ? "Deleting…" : "Delete run"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-neutral-400">
        Cancel
      </button>
      {error ? (
        <span data-testid="delete-run-error" className="text-red-300">
          {error}
        </span>
      ) : null}
    </span>
  );
}
