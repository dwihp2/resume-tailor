import { prisma } from "./db";

export const LOCAL_OWNER_EMAIL = "local@resume-tailor";

/**
 * ADR-0002: V1 has no login. Every row still hangs off an owner, so the first
 * request creates the single local user rather than requiring a seed step that
 * a fresh database could be missing.
 */
export async function ensureOwner() {
  const existing = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.user.create({ data: { email: LOCAL_OWNER_EMAIL } });
}
