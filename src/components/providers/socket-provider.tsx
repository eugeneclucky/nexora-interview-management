"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const instance = io({ path: "/socket.io" });
    socketRef.current = instance;
    setSocket(instance);

    instance.on("connect", () => {
      instance.emit("identify", session.user.id);
    });

    return () => {
      instance.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [status, session?.user?.id]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
