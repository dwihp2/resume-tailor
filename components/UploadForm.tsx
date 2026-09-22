"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postForm } from "@/lib/client";

export function UploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const created = (await postForm("/api/runs", form)) as { id: string };
      router.push(`/runs/${created.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-neutral-400">Resume</span>
          <input
            data-testid="resume-file"
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            required
            className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-200 file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-2 file:py-1 file:text-neutral-100"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-neutral-400">Company (optional)</span>
            <input
              data-testid="company-name"
              name="companyName"
              placeholder="Xenith"
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-200"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-400">Role (optional)</span>
            <input
              data-testid="role-title"
              name="roleTitle"
              placeholder="Fullstack Engineer"
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-200"
            />
          </label>
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-neutral-400">Job description</span>
        <textarea
          data-testid="jd-text"
          name="jdText"
          required
          rows={8}
          placeholder="Paste the posting here."
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-200"
        />
      </label>

      {error ? (
        <p data-testid="upload-error" className="rounded border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <button
        data-testid="submit-run"
        type="submit"
        disabled={busy}
        className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 disabled:opacity-50"
      >
        {busy ? "Reading the resume…" : "Start tailoring"}
      </button>
    </form>
  );
}
