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

const dotClasses = "loader-dots-dot rounded-full";
const defaultDots = [
  "bg-olive",
  "bg-olive-mid loader-dots-delay-200",
  "bg-sand loader-dots-delay-400",
];
const lightDots = [
  "bg-white",
  "bg-white/80 loader-dots-delay-200",
  "bg-white/60 loader-dots-delay-400",
];

export function LoaderDots({ className, variant = "default", size = "md" }: LoaderDotsProps) {
  const colors = variant === "light" ? lightDots : defaultDots;
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5",
        size === "sm" && "gap-1 scale-75 origin-center",
        className
      )}
      role="status"
      aria-label="جاري التحميل"
    >
      {colors.map((c, i) => (
        <span key={i} className={cn(dotClasses, c)} />
      ))}
    </div>
  );
}
