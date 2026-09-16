import Image from "next/image";
import { cn } from "@/lib/cn";

export function Logo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/avatar.png"
      alt="Nexora Consultant"
      width={size}
      height={size}
      className={cn("rounded-full shrink-0", className)}
      priority
    />
  );
}
