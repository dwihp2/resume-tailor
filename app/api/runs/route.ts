import { DomainError } from "@/lib/errors";
import { fail, ok } from "@/lib/api";
import { createRun } from "@/lib/run";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new DomainError("Attach the resume as a PDF.");
    }
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      throw new DomainError("That file is not a PDF. Export the resume as PDF and try again.");
    }
    const jdText = String(form.get("jdText") ?? "").trim();
    if (jdText.length < 40) {
      throw new DomainError("Paste the job description text — a few sentences at least.");
    }

    const run = await createRun({
      file: await file.arrayBuffer(),
      fileName: file.name,
      jdText,
      companyName: String(form.get("companyName") ?? ""),
      roleTitle: String(form.get("roleTitle") ?? ""),
    });
    return ok(run, 201);
  } catch (error) {
    return fail(error);
  }
}
