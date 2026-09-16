import { prisma } from "@/lib/prisma";

/**
 * Activity logging is best-effort audit trail, not part of the operation it
 * describes. It must never fail a request that already succeeded (e.g. a
 * foreign key violation if the acting user's own row was concurrently
 * removed elsewhere) -- so failures are swallowed and logged server-side.
 */
export async function logActivity(params: {
  data: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    meta?: string;
  };
}) {
  try {
    await prisma.activityLog.create(params);
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
}
