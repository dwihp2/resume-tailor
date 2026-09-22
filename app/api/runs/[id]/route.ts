import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { deleteRun, saveNotes } from "@/lib/run";

export const runtime = "nodejs";

const body = z.object({ notes: z.string().max(20_000).nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { notes } = body.parse(await request.json());
    const run = await saveNotes(id, notes);
    return ok({ id: run.id, hasNotes: Boolean(run.notes) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return ok(await deleteRun(id));
  } catch (error) {
    return fail(error);
  }
}
