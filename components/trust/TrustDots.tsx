import { confirmationsToDotsCount } from "@/lib/trust";
import { cn } from "@/lib/utils";

interface TrustDotsProps {
  confirmations: number;
  className?: string;
}

export function TrustDots({ confirmations, className }: TrustDotsProps) {
  const filled = confirmationsToDotsCount(confirmations);

  return (
    <div className={cn("flex gap-1 items-center", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-colors",
            i < filled
              ? filled >= 4
                ? "bg-olive"
                : filled >= 2
                ? "bg-sand"
                : "bg-mist"
              : "bg-border"
          )}
        />
      ))}
    </div>
  );
}
