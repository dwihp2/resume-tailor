import { ZodError } from "zod";
import { DomainError } from "./errors";

export function ok(data: unknown, status = 200): Response {
  return Response.json(data as Record<string, unknown>, { status });
}

/**
 * One place that decides what the UI is told. Domain and validation failures
 * are the user's problem to fix (422); everything else is ours (500), and the
 * message is still surfaced because a silent failure here costs more than a
 * blunt one.
 */
export function fail(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      { error: "Invalid request", issues: error.issues.map((issue) => issue.message) },
      { status: 422 },
    );
  }
  if (error instanceof DomainError) {
    return Response.json({ error: error.message }, { status: 422 });
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  return Response.json({ error: message }, { status: 500 });
}
