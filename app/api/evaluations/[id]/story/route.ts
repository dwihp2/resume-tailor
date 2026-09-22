import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { submitStory } from "@/lib/run";

export const runtime = "nodejs";

const body = z.object({ answer: z.string().trim().min(3, "Write what actually happened.") });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { answer } = body.parse(await request.json());
    const story = await submitStory(id, answer);
    return ok({ id: story.id }, 201);
  } catch (error) {
    return fail(error);
  }
}
