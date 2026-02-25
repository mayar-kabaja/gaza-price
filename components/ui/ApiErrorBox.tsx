"use client";

/**
 * Inline API error display. Use near the form/button that caused the error.
 * Backend always returns Arabic message — display as-is.
 * Optional countdown for 429 using retry_after_seconds.
 */
interface ApiErrorBoxProps {
  message: string;
  retryAfterSeconds?: number;
  onDismiss?: () => void;
}

export function ApiErrorBox({ message, retryAfterSeconds, onDismiss }: ApiErrorBoxProps) {
  return (
    <div
      className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <span className="flex-1 min-w-0">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 text-red-500 hover:text-red-700 p-0.5 leading-none"
            aria-label="إغلاق"
          >
            ×
          </button>
        )}
      </div>
      {retryAfterSeconds != null && retryAfterSeconds > 0 && (
        <p className="text-red-600/90 text-xs mt-2">
          يمكنك المحاولة بعد {retryAfterSeconds} ثانية
        </p>
      )}
    </div>
  );
}
