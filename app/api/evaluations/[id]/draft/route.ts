import { fail, ok } from "@/lib/api";
import { draftAnswer } from "@/lib/run";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Drafts an answer from the candidate's notes. Deliberately does not save it:
 * the candidate saves it themselves, so the Story stays their own statement.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return ok(await draftAnswer(id));
  } catch (error) {
    return fail(error);
  }
}
