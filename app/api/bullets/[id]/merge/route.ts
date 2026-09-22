import { fail, ok } from "@/lib/api";
import { mergeBulletWithPrevious } from "@/lib/run";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return ok(await mergeBulletWithPrevious(id));
  } catch (error) {
    return fail(error);
  }
}
