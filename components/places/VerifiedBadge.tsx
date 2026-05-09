/** Verified seal — shown for places on basic or premium plans */
export function VerifiedBadge({ plan, size = "sm" }: { plan?: string; size?: "sm" | "md" }) {
  if (plan !== "basic" && plan !== "premium") return null;

  const px = size === "sm" ? 14 : 18;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="موثّق"
      className="flex-shrink-0"
    >
      <path
        d="M12 2L14.8 5.2L19 4L19 8.4L22.6 10.8L20.4 14.4L22.6 18L19 18L19 22.4L14.8 20.8L12 24L9.2 20.8L5 22.4L5 18L1.4 18L3.6 14.4L1.4 10.8L5 8.4L5 4L9.2 5.2Z"
        fill="#4A7C59"
      />
      <polyline
        points="8 12.5 11 15.5 16.5 9"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
