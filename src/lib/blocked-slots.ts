import { prisma } from "@/lib/prisma";

/** Standard interval overlap: (StartA < EndB) && (EndA > StartB). */
export async function findOverlappingBlock(callerId: string, start: Date, end: Date) {
  return prisma.blockedSlot.findFirst({
    where: {
      callerId,
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });
}
