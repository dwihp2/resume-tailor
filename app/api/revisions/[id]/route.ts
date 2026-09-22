import { fail, ok } from "@/lib/api";
import { decideRevision } from "@/lib/run";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const revision = await decideRevision(id, await request.json());
    return ok({ id: revision.id, decision: revision.decision });
  } catch (error) {
    return fail(error);
  }
}
