import { useState, useEffect } from "react";
import type { ValidationStatus, ValidationResult } from "./useProductNameValidation";

export type { ValidationStatus, ValidationResult };

const ONLY_DIGITS = /^[0-9٠-٩\s]+$/;
const HAS_SPECIAL = /[!@#$%^&*()_+=[\]{};':"\\|,.<>?/~`]/;
const HAS_URL = /https?:\/\/|www\.|\.com|\.net|\.org/i;
const ONLY_LATIN_RANDOM = /^[a-zA-Z]{1,3}([0-9a-zA-Z]*)$/;
const HAS_ARABIC_OR_LATIN_WORD = /[\u0600-\u06FFa-zA-Z]{2,}/;

function validateStoreName(name: string): ValidationResult {
  const trimmed = name.trim();

  const invalid: ValidationResult = { status: "invalid", reason: "يرجى إدخال اسم متجر حقيقي", suggestion: null };

  if (ONLY_DIGITS.test(trimmed)) return invalid;
  if (HAS_URL.test(trimmed)) return invalid;
  if (HAS_SPECIAL.test(trimmed)) return invalid;
  if (ONLY_LATIN_RANDOM.test(trimmed) && trimmed.length < 4) return invalid;
  if (!HAS_ARABIC_OR_LATIN_WORD.test(trimmed)) return invalid;

  return { status: "valid", reason: "", suggestion: null };
}

export function useStoreNameValidation(
  name: string,
  debounceMs = 300
): ValidationResult {
  const [state, setState] = useState<ValidationResult>({
    status: "idle",
    reason: "",
    suggestion: null,
  });

  useEffect(() => {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setState({ status: "idle", reason: "", suggestion: null });
      return;
    }

    const timer = setTimeout(() => {
      setState(validateStoreName(trimmed));
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [name, debounceMs]);

  return state;
}
