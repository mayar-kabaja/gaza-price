"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic";
const MAX_MB = 5;

interface ReceiptUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  onError?: (msg: string) => void;
  uploadFn: (file: File) => Promise<string>;
  disabled?: boolean;
}

export function ReceiptUpload({
  value,
  onChange,
  onError,
  uploadFn,
  disabled = false,
}: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      onError?.(`الحد الأقصى ${MAX_MB} ميجابايت`);
      return;
    }
    setUploading(true);
    onError?.("");
    try {
      const url = await uploadFn(file);
      onChange(url);
    } catch (err) {
      onChange(null);
      onError?.(err instanceof Error ? err.message : "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-xs font-bold text-mist uppercase tracking-widest mb-2">
        صورة الإيصال (اختياري)
      </label>
      <div
        className={cn(
          "border-2 border-dashed rounded-2xl p-6 text-center transition-colors",
          value ? "border-olive bg-olive-pale" : "border-border bg-fog/50",
          !disabled && !uploading && "cursor-pointer hover:border-olive-mid"
        )}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            !disabled && !uploading && inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFile}
          disabled={disabled || uploading}
          className="hidden"
        />
        {uploading ? (
          <p className="text-sm text-mist font-body">جاري الرفع...</p>
        ) : value ? (
          <div className="space-y-2">
            <span className="text-2xl block">✓</span>
            <p className="text-sm text-olive font-body">تم رفع صورة الإيصال</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              disabled={disabled}
              className="text-xs text-mist hover:text-ink underline"
            >
              إزالة
            </button>
          </div>
        ) : (
          <>
            <span className="text-2xl block mb-2">📸</span>
            <p className="text-sm text-mist font-body">اضغط لرفع صورة</p>
            <p className="text-xs text-mist mt-1">JPG, PNG حتى {MAX_MB} ميجابايت</p>
          </>
        )}
      </div>
    </div>
  );
}
