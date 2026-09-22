import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { dropSection } from "@/lib/run";

export const runtime = "nodejs";

const body = z.object({
  // null targets the bullets that never got a heading.
  section: z.union([z.string().trim().min(1), z.null()]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { section } = body.parse(await request.json());
    return ok(await dropSection(id, section));
  } catch (error) {
    return fail(error);
  }
}
