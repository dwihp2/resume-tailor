import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { deleteBullet, moveBullet, updateBulletText } from "@/lib/run";

export const runtime = "nodejs";

const patchBody = z
  .object({ text: z.string().trim().min(2).optional(), move: z.union([z.literal(-1), z.literal(1)]).optional() })
  .refine((value) => value.text !== undefined || value.move !== undefined, {
    message: "Send either text or move.",
  });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = patchBody.parse(await request.json());
    if (input.text !== undefined) await updateBulletText(id, input.text);
    if (input.move !== undefined) await moveBullet(id, input.move);
    return ok({ id });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteBullet(id);
    return ok({ id });
  } catch (error) {
    return fail(error);
  }
}
