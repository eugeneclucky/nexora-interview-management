import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveAvatarFile } from "@/lib/uploads";
import { broadcastToManagerScope } from "@/lib/socket";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const { url } = await saveAvatarFile(file);

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: url },
      select: { id: true, name: true, avatarUrl: true, managerId: true },
    });

    if (user.managerId) {
      broadcastToManagerScope(user.managerId, "caller:updated", user);
    }

    return NextResponse.json({ avatarUrl: url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
