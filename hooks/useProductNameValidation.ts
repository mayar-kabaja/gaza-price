import { useState, useEffect, useRef } from "react";

export type ValidationStatus = "idle" | "checking" | "valid" | "invalid" | "error";

export type ValidationResult = {
  status: ValidationStatus;
  reason: string;
  suggestion: string | null;
};

export function useProductNameValidation(
  name: string,
  debounceMs = 600
): ValidationResult {
  const [state, setState] = useState<ValidationResult>({
    status: "idle",
    reason: "",
    suggestion: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setState({ status: "idle", reason: "", suggestion: null });
      return;
    }

    setState((prev) => ({ ...prev, status: "checking" }));

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/ai/validate-product-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error("server error");

        const data = await res.json();

        setState({
          status: data.valid ? "valid" : "invalid",
          reason: data.reason ?? "",
          suggestion: data.suggestion ?? null,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setState({ status: "error", reason: "", suggestion: null });
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [name, debounceMs]);

  return state;
}
