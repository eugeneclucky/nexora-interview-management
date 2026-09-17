import { cn } from "@/lib/cn";

export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-full overflow-hidden bg-accent text-accent-foreground flex items-center justify-center font-semibold",
        className
      )}
      style={{ width: size, height: size, fontSize: size / 2.5 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded files are served from our own API, not next/image-optimizable remote hosts
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}
