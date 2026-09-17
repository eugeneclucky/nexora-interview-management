"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { COMMON_TIMEZONES } from "@/lib/timezones";

export function TimezoneSelect({
  id,
  value,
  onChange,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const selected = COMMON_TIMEZONES.find((tz) => tz.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMON_TIMEZONES;
    return COMMON_TIMEZONES.filter(
      (tz) => tz.label.toLowerCase().includes(q) || tz.value.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[highlighted] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  function selectOption(tz: string) {
    onChange(tz);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
        setHighlighted(0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlighted];
      if (opt) selectOption(opt.value);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-foreground cursor-text focus-within:ring-2 focus-within:ring-ring",
          className
        )}
        onClick={() => {
          setOpen(true);
          setHighlighted(0);
          inputRef.current?.focus();
        }}
      >
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-muted-foreground"
          value={open ? query : (selected?.label ?? value)}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(0);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setHighlighted(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search timezone..."
        />
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg py-1"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">No timezones match.</li>
          )}
          {filtered.map((tz, i) => (
            <li
              key={tz.value}
              role="option"
              aria-selected={tz.value === value}
              onMouseDown={(e) => {
                // Prevent the input's blur (which would close the list before
                // the click below gets a chance to register on it).
                e.preventDefault();
                selectOption(tz.value);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer truncate",
                i === highlighted
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-muted",
                tz.value === value && "font-medium"
              )}
            >
              {tz.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
