import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { prisma } from "@/lib/prisma";
import { setIO, managerRoom, ADMIN_ROOM } from "@/lib/socket";
import { startReminderScheduler } from "@/lib/reminder-scheduler";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
  });
  setIO(io);

  io.on("connection", (socket) => {
    socket.on("identify", async (userId: string) => {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return;

        if (user.role === "SUPER_ADMIN") {
          socket.join(ADMIN_ROOM);
        } else if (user.role === "MANAGER") {
          socket.join(managerRoom(user.id));
        } else if (user.role === "CALLER" && user.managerId) {
          socket.join(managerRoom(user.managerId));
        }
      } catch {
        // ignore malformed identify payloads
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    startReminderScheduler();
  });
});
