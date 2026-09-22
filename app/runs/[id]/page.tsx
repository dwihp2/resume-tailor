import Link from "next/link";
import { notFound } from "next/navigation";
import { BulletWorkbench } from "@/components/BulletWorkbench";
import { RunNotes } from "@/components/RunNotes";
import { SegmentationEditor } from "@/components/SegmentationEditor";
import { getRunView } from "@/lib/run";

export const dynamic = "force-dynamic";

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRunView(id);
  if (!run) notFound();

  const { progress } = run;
  const scored = progress.scored > 0;
  const job = [run.job.roleTitle, run.job.companyName].filter(Boolean).join(" · ");

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300">
          ← All runs
        </Link>
        <h1 className="text-xl font-semibold">{run.resume.title}</h1>
        <p className="text-sm text-neutral-400">{job || "No role recorded"}</p>
        <dl data-testid="progress" className="flex flex-wrap gap-3 text-xs text-neutral-400">
          <dd>{progress.bullets} bullets</dd>
          <dd>{progress.scored} scored</dd>
          <dd>{progress.answered} answered</dd>
          <dd>{progress.revised} rewritten</dd>
          <dd>{progress.decided} decided</dd>
        </dl>
        <details className="rounded border border-neutral-800 bg-neutral-900/40 p-3 text-xs text-neutral-400">
          <summary className="cursor-pointer">Job description and what was extracted from it</summary>
          <div className="mt-2 space-y-2">
            {run.job.requirements ? (
              <p>
                skills: {run.job.requirements.skills.join(", ") || "none"} · tools:{" "}
                {run.job.requirements.tools.join(", ") || "none"} · domain:{" "}
                {run.job.requirements.domainTerms.join(", ") || "none"}
              </p>
            ) : (
              <p>No requirements were extracted for this job description.</p>
            )}
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-neutral-500">
              {run.job.rawText}
            </pre>
          </div>
        </details>
      </header>

      {scored ? <BulletWorkbench bullets={run.bullets} hasNotes={Boolean(run.notes)} /> : null}

      <RunNotes runId={run.id} notes={run.notes} />

      <details
        open={!scored}
        data-testid="segmentation-panel"
        className="rounded border border-neutral-800 p-4"
      >
        <summary className="cursor-pointer text-sm text-neutral-400">
          Segmentation {scored ? "(edit and re-score)" : "— fix this before scoring"}
        </summary>
        <div className="mt-3">
          <SegmentationEditor
            runId={run.id}
            resumeId={run.resume.id}
            bullets={run.bullets.map((bullet) => ({
              id: bullet.id,
              section: bullet.section,
              text: bullet.text,
            }))}
          />
        </div>
      </details>
    </main>
  );
}
