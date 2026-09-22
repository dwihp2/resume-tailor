import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { addBullet } from "@/lib/run";

export const runtime = "nodejs";

const body = z.object({
  resumeId: z.string().uuid(),
  text: z.string().trim().min(2),
  section: z.string().trim().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const input = body.parse(await request.json());
    const bullet = await addBullet(input.resumeId, input.text, input.section ?? null);
    return ok({ id: bullet.id, displayOrder: bullet.displayOrder }, 201);
  } catch (error) {
    return fail(error);
  }
}
