"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RunBulletView } from "@/lib/run";
import { diffWords } from "@/lib/diff";
import { patchJson, postEmpty, postJson } from "@/lib/client";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(scratch);
    return copied;
  }
}

function keptText(bullet: RunBulletView): string | null {
  const kept = bullet.revisions.filter(
    (revision) => revision.decision === "accepted" || revision.decision === "edited",
  );
  if (kept.length === 0) return null;
  return kept
    .map((revision) => revision.decidedText ?? revision.text)
    .join("\n");
}

function DiffLine({ before, after }: { before: string; after: string }) {
  const { before: oldTokens, after: newTokens } = diffWords(before, after);
  return (
    <div className="space-y-1 text-sm">
      <p className="text-neutral-400">
        {oldTokens.map((token, index) => (
          <span key={index} className={token.changed ? "bg-red-950 text-red-300 line-through" : undefined}>
            {token.value}{" "}
          </span>
        ))}
      </p>
      <p className="text-neutral-100">
        {newTokens.map((token, index) => (
          <span key={index} className={token.changed ? "bg-emerald-950 text-emerald-200" : undefined}>
            {token.value}{" "}
          </span>
        ))}
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 70 ? "bg-emerald-950 text-emerald-300" : score >= 35 ? "bg-amber-950 text-amber-300" : "bg-red-950 text-red-300";
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tone}`}>{score}</span>;
}

function BulletCard({ bullet }: { bullet: RunBulletView }) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const kept = keptText(bullet);
  const revisions = [...bullet.revisions].reverse();

  return (
    <li
      data-testid="bullet-card"
      data-score={bullet.score ?? ""}
      className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4"
    >
      <div className="flex items-start gap-3">
        <ScoreBadge score={bullet.score ?? 0} />
        <div className="flex-1 space-y-1">
          <p data-testid="bullet-text" className="text-sm text-neutral-100">
            {bullet.text}
          </p>
          <div className="flex flex-wrap gap-1 text-xs">
            {bullet.matched.map((term) => (
              <span key={term} className="rounded bg-emerald-950 px-1.5 py-0.5 text-emerald-300">
                {term}
              </span>
            ))}
            {bullet.missing.map((term) => (
              <span key={term} className="rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-500">
                missing: {term}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
          {bullet.overlapGap ? (
            <span data-testid="overlap-gap" className="rounded bg-amber-950 px-1.5 py-0.5 text-amber-300">
              Overlap gap
            </span>
          ) : null}
          {bullet.evidenceGap ? (
            <span data-testid="evidence-gap" className="rounded bg-sky-950 px-1.5 py-0.5 text-sky-300">
              Evidence gap
            </span>
          ) : null}
        </div>
      </div>

      {bullet.question ? (
        <div className="space-y-2 rounded border border-neutral-800 bg-neutral-950/60 p-3">
          <p data-testid="bullet-question" className="text-sm text-neutral-300">
            {bullet.question}
          </p>
          <textarea
            data-testid="story-input"
            rows={3}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Answer with what actually happened — numbers you can defend."
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              data-testid="save-story"
              type="button"
              disabled={busy || answer.trim().length < 3 || !bullet.evaluationId}
              onClick={() =>
                run(async () => {
                  await postJson(`/api/evaluations/${bullet.evaluationId}/story`, { answer });
                  setAnswer("");
                })
              }
              className="rounded border border-neutral-700 px-3 py-1 text-xs disabled:opacity-40"
            >
              Save answer
            </button>
            <button
              data-testid="generate-revision"
              type="button"
              disabled={busy || bullet.stories.length === 0 || !bullet.evaluationId}
              onClick={() => run(() => postEmpty(`/api/evaluations/${bullet.evaluationId}/revision`))}
              className="rounded bg-emerald-500 px-3 py-1 text-xs font-medium text-emerald-950 disabled:opacity-40"
            >
              Write the rewrite
            </button>
          </div>
          {bullet.stories.length > 0 ? (
            <ul data-testid="story-facts" className="space-y-1 text-xs text-neutral-400">
              {bullet.stories.map((story) => (
                <li key={story.id}>
                  You said: <span className="text-neutral-300">{story.rawInput}</span>
                  {story.facts.length > 0 ? (
                    <span className="text-neutral-500"> — facts: {story.facts.join(", ")}</span>
                  ) : (
                    <span className="text-amber-400"> — no facts found in that answer</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p data-testid="bullet-error" className="rounded border border-red-900 bg-red-950/50 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      {revisions.length > 0 ? (
        <ul data-testid="revisions" className="space-y-2">
          {revisions.map((revision) => (
            <li key={revision.id} data-testid="revision" data-decision={revision.decision} className="space-y-2 rounded border border-neutral-800 p-3">
              <DiffLine before={bullet.text} after={revision.text} />
              <p data-testid="revision-text" className="hidden">
                {revision.text}
              </p>
              <p className="text-xs text-neutral-500">from {revision.modelName}</p>

              {revision.decision === "pending" ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    data-testid="accept-revision"
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => patchJson(`/api/revisions/${revision.id}`, { decision: "accepted" }))}
                    className="rounded bg-emerald-500 px-3 py-1 font-medium text-emerald-950 disabled:opacity-40"
                  >
                    Accept
                  </button>
                  <button
                    data-testid="edit-revision"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(revision.id);
                      setEditText(revision.text);
                    }}
                    className="rounded border border-neutral-700 px-3 py-1 disabled:opacity-40"
                  >
                    Edit
                  </button>
                  <button
                    data-testid="reject-revision"
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => patchJson(`/api/revisions/${revision.id}`, { decision: "rejected" }))}
                    className="rounded border border-red-900 px-3 py-1 text-red-300 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  {revision.decision}
                  {revision.decidedText ? ` — kept: ${revision.decidedText}` : ""}
                </p>
              )}

              {editingId === revision.id ? (
                <div className="space-y-2">
                  <textarea
                    data-testid="revision-edit-input"
                    rows={2}
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200"
                  />
                  <button
                    data-testid="save-edit"
                    type="button"
                    disabled={busy || editText.trim().length < 2}
                    onClick={() =>
                      run(async () => {
                        await patchJson(`/api/revisions/${revision.id}`, { decision: "edited", decidedText: editText });
                        setEditingId(null);
                      })
                    }
                    className="rounded bg-emerald-500 px-3 py-1 text-xs font-medium text-emerald-950 disabled:opacity-40"
                  >
                    Save edit
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {kept ? (
        <div className="flex items-center gap-2 text-xs">
          <span data-testid="kept-text" className="text-neutral-300">
            Kept: {kept}
          </span>
          <button
            data-testid="copy-kept"
            type="button"
            onClick={async () => setCopied(await copyText(kept))}
            className="rounded border border-neutral-700 px-2 py-1"
          >
            Copy
          </button>
          {copied ? (
            <span data-testid="copy-status" className="text-emerald-300">
              Copied
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function BulletWorkbench({ bullets }: { bullets: RunBulletView[] }) {
  const [copiedAll, setCopiedAll] = useState(false);

  // Worst first: the bullets that need attention are the ones worth reading.
  const ordered = bullets
    .filter((bullet) => bullet.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || a.displayOrder - b.displayOrder);

  const kept = ordered.map(keptText).filter((text): text is string => Boolean(text));
  const markdown = kept.map((text) => `- ${text}`).join("\n");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Scored bullets, worst first</h2>
        <div className="flex items-center gap-2">
          <button
            data-testid="copy-all-kept"
            type="button"
            disabled={kept.length === 0}
            onClick={async () => setCopiedAll(await copyText(markdown))}
            className="rounded border border-neutral-700 px-3 py-2 text-sm disabled:opacity-40"
          >
            Copy accepted bullets ({kept.length})
          </button>
          {copiedAll ? (
            <span data-testid="copy-all-status" className="text-xs text-emerald-300">
              Copied
            </span>
          ) : null}
        </div>
      </div>
      <ul data-testid="scored-list" className="space-y-3">
        {ordered.map((bullet) => (
          <BulletCard key={bullet.id} bullet={bullet} />
        ))}
      </ul>
    </section>
  );
}
