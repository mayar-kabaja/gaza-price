export const GA_ID = "G-65JFCV2W9J";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function event({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) {
  window.gtag?.("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
}
