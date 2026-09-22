import { fail, ok } from "@/lib/api";
import { createRevision } from "@/lib/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const revision = await createRevision(id);
    return ok({ id: revision.id, text: revision.revisionText }, 201);
  } catch (error) {
    return fail(error);
  }
}
