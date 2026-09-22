import Link from "next/link";
import { DeleteRunButton } from "@/components/DeleteRunButton";
import { UploadForm } from "@/components/UploadForm";
import { modelLabel } from "@/lib/model";
import { listRuns } from "@/lib/run";

export const dynamic = "force-dynamic";

export default async function Home() {
  const runs = await listRuns();

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Resume Tailor</h1>
        <p className="text-sm text-neutral-400">
          Scores every bullet against a job description, asks about the ones that state no result, and rewrites them
          using only facts you supplied.
        </p>
        <p data-testid="model-label" className="text-xs text-neutral-500">
          Rewrites come from: {modelLabel()}
        </p>
      </header>

      <UploadForm />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Runs</h2>
        {runs.length === 0 ? (
          <p data-testid="empty-runs" className="rounded border border-dashed border-neutral-800 px-4 py-6 text-sm text-neutral-500">
            No runs yet. Upload a resume and paste a job description to start one.
          </p>
        ) : (
          <ul data-testid="run-list" className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
            {runs.map((run) => {
              const decided = run.evaluations.filter((evaluation) =>
                evaluation.revisions.some((revision) => revision.decision !== "pending"),
              ).length;
              return (
                <li key={run.id} className="flex items-center gap-2 pr-3">
                  <Link href={`/runs/${run.id}`} className="block flex-1 px-4 py-3 hover:bg-neutral-900">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-medium">{run.resume.title}</span>
                      <span className="text-xs text-neutral-500">
                        {run.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {[run.jobDescription.roleTitle, run.jobDescription.companyName].filter(Boolean).join(" · ") ||
                        "No role recorded"}
                      {" — "}
                      {run.evaluations.length} scored, {decided} decided
                    </p>
                  </Link>
                  <DeleteRunButton runId={run.id} label={run.resume.title} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
