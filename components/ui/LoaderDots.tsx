import { cn } from "@/lib/utils";

export type LoaderDotsVariant = "default" | "light";

interface LoaderDotsProps {
  /** Wrapper class for layout (e.g. gap, margin). */
  className?: string;
  /** default = olive/sand (on light or dark bg). light = white dots (on olive/dark). */
  variant?: LoaderDotsVariant;
  /** sm = smaller dots for inline/buttons. */
  size?: "sm" | "md";
}

export function LoaderDots({ className, variant = "default", size = "md" }: LoaderDotsProps) {
  const s = size === "sm" ? 16 : 24;
  const stroke = variant === "light" ? "rgba(255,255,255,0.9)" : "var(--color-olive, #4A7C59)";
  const trackStroke = variant === "light" ? "rgba(255,255,255,0.2)" : "var(--color-border, #e2e8f0)";
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      role="status"
      aria-label="جاري التحميل"
    >
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="animate-spin">
        <circle cx="12" cy="12" r="10" stroke={trackStroke} strokeWidth="3" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
