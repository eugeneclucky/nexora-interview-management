"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { cn } from "@/lib/cn";

export function LiveIndicator() {
  const socket = useSocket();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      setConnected(false);
      return;
    }
    setConnected(socket.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground"
      title={connected ? "Live updates connected" : "Reconnecting..."}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          connected ? "bg-success animate-pulse" : "bg-muted-foreground/40"
        )}
      />
      {connected ? "Live" : "Offline"}
    </div>
  );
}
