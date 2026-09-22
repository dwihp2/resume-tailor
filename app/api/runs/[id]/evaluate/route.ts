import { fail, ok } from "@/lib/api";
import { evaluateRun } from "@/lib/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return ok(await evaluateRun(id));
  } catch (error) {
    return fail(error);
  }
}
