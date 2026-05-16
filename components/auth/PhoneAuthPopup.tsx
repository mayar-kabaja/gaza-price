"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { setStoredToken } from "@/lib/auth/token";
import { getDeviceId } from "@/lib/fingerprint";

// ── SVG Icon Components ──
function IconWave({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 11.5V7a5 5 0 0 1 10 0v4.5" /><path d="M5.5 15a6.5 6.5 0 0 0 13 0V12a2 2 0 0 0-2-2h-9a2 2 0 0 0-2 2v3z" />
    </svg>
  );
}
function IconKey({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
function IconUserPlus({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
function IconMessage({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconLock({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconEdit({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function IconCheck({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconBan({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}
function IconEye({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function IconWhatsApp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

type Step = "phone" | "otp" | "password" | "name" | "success";

interface PriceDetails {
  productName?: string;
  price?: string;
  areaName?: string;
}

interface PhoneAuthPopupProps {
  open: boolean;
  onClose: () => void;
  onVerified: (accessToken: string) => void;
  priceDetails?: PriceDetails;
  mode?: "submit" | "login";
  reason?: string;
}

export function PhoneAuthPopup({
  open,
  onClose,
  onVerified,
  priceDetails,
  mode = "submit",
  reason,
}: PhoneAuthPopupProps) {
  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState<"970" | "972">("970");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [verifiedToken, setVerifiedToken] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(90);
  const [canResend, setCanResend] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [retryCountdown, setRetryCountdown] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Password flow state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login" | "forgot">("login");
  const [isNewUser, setIsNewUser] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when popup opens
  useEffect(() => {
    if (open) {
      setStep("phone");
      setCountryCode("970");
      setPhone("");
      setDisplayName("");
      setOtp(["", "", "", "", "", ""]);
      setSending(false);
      setVerifying(false);
      setSavingName(false);
      setVerifiedToken("");
      setError("");
      setShake(false);
      setCountdown(90);
      setCanResend(false);
      setBlocked(false);
      setBlockMessage("");
      setRetryCountdown(0);
      setPassword("");
      setShowPassword(false);
      setAuthMode("login");
      setIsNewUser(false);
      setSettingPassword(false);
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
      setTimeout(() => phoneInputRef.current?.focus(), 300);
      getDeviceId().then(setDeviceId);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, [open]);

  const startCountdown = useCallback(() => {
    setCountdown(90);
    setCanResend(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startRetryCountdown = useCallback((seconds: number) => {
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    setRetryCountdown(seconds);
    retryTimerRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(retryTimerRef.current!);
          retryTimerRef.current = null;
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  function parseWaitSeconds(msg: string): number {
    const minMatch = msg.match(/(\d+)\s*دقيق/);
    if (minMatch) return parseInt(minMatch[1], 10) * 60;
    const secMatch = msg.match(/(\d+)\s*ثاني/);
    if (secMatch) return parseInt(secMatch[1], 10);
    return 10;
  }

  const formattedPhone = phone
    ? `+${countryCode} ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`
    : "";

  const stripped = phone.startsWith("0") ? phone.slice(1) : phone;
  const fullPhone = `${countryCode}${stripped}`;

  function validatePhone(): boolean {
    const cleaned = phone.replace(/\D/g, "");
    const local = cleaned.startsWith("0") ? cleaned : `0${cleaned}`;
    if (!/^(059|056)\d{7}$/.test(local)) {
      setError("رقم الهاتف غير صحيح — يجب أن يبدأ بـ 059 أو 056 ويتكون من 10 أرقام");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return false;
    }
    return true;
  }

  async function handleLogin() {
    if (!validatePhone()) return;
    if (!password || password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/phone/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError(data.message || "رقم الهاتف أو كلمة المرور غير صحيحة");
        } else if (res.status === 429) {
          const msg = data.message || "محاولات كثيرة — انتظر قليلاً";
          setError(msg);
          startRetryCountdown(parseWaitSeconds(msg));
        } else {
          setError(data.message || "فشل تسجيل الدخول");
        }
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setSending(false);
        return;
      }

      const token = data.access_token;
      setStoredToken(token);
      setVerifiedToken(token);
      setStep("success");
      setTimeout(() => onVerified(token), 2000);
    } catch {
      setError("تعذر الاتصال — تحقق من الإنترنت");
    } finally {
      setSending(false);
    }
  }

  async function handleSendOtp() {
    if (!validatePhone()) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(deviceId ? { "X-Device-Id": deviceId } : {}),
        },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();

      if (res.status === 429) {
        if (data.error === "DEVICE_BLOCKED") {
          setBlocked(true);
          setBlockMessage(data.message || "تم حظرك مؤقتاً — حاول لاحقاً");
        } else {
          const msg = data.message || "انتظر قليلاً قبل المحاولة مرة أخرى";
          setError(msg);
          startRetryCountdown(parseWaitSeconds(msg));
        }
        setSending(false);
        return;
      }

      if (!res.ok) {
        setError(data.message || "فشل إرسال الرمز");
        setTimeout(() => setError((prev) => prev === (data.message || "فشل إرسال الرمز") ? "" : prev), 5000);
        setSending(false);
        return;
      }

      setStep("otp");
      startCountdown();
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch {
      setError("تعذر الاتصال — تحقق من الإنترنت");
      setTimeout(() => setError((prev) => prev === "تعذر الاتصال — تحقق من الإنترنت" ? "" : prev), 5000);
    } finally {
      setSending(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    const normalized = value.replace(/[٠-٩]/g, (d: string) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    const digit = normalized.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const code = [...newOtp.slice(0, 5), digit].join("");
      if (code.length === 6) handleOtpComplete(code);
    } else {
      const code = newOtp.join("");
      if (code.length === 6) handleOtpComplete(code);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const raw = e.clipboardData.getData("text").replace(/[٠-٩]/g, (d: string) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    const pasted = raw.replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
      handleOtpComplete(pasted);
    }
  }

  function handleOtpComplete(code: string) {
    if (authMode === "forgot") {
      setStep("password");
      setPassword("");
      return;
    }
    handleVerifyOtp(code);
  }

  async function handleVerifyOtp(code: string) {
    setVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/auth/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "رمز التحقق غير صحيح");
        setShake(true);
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => {
          setShake(false);
          otpRefs.current[0]?.focus();
        }, 500);
        setVerifying(false);
        return;
      }

      const token = data.access_token;
      setStoredToken(token);
      setVerifiedToken(token);
      setIsNewUser(!!data.is_new_user);

      if (data.is_new_user || !data.has_password) {
        setStep("password");
        setVerifying(false);
        return;
      }

      setStep("success");
      setTimeout(() => onVerified(token), 2000);
    } catch {
      setError("تعذر الاتصال — تحقق من الإنترنت");
      setVerifying(false);
    }
  }

  async function handleSaveName() {
    if (!displayName.trim()) {
      setError("الاسم مطلوب");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setSavingName(true);
    setError("");

    try {
      const res = await fetch("/api/auth/phone/complete-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${verifiedToken}`,
        },
        body: JSON.stringify({ display_handle: displayName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "فشل حفظ الاسم");
        setSavingName(false);
        return;
      }

      setStep("success");
      setTimeout(() => onVerified(verifiedToken), 2000);
    } catch {
      setError("تعذر الاتصال — تحقق من الإنترنت");
      setSavingName(false);
    }
  }

  async function handleSetPassword() {
    if (!password || password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setSettingPassword(true);
    setError("");

    try {
      if (authMode === "forgot") {
        const res = await fetch("/api/auth/phone/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: fullPhone, code: otp.join(""), password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "فشل تعيين كلمة المرور");
          setSettingPassword(false);
          return;
        }
        const token = data.access_token;
        setStoredToken(token);
        setVerifiedToken(token);
        setStep("success");
        setTimeout(() => onVerified(token), 2000);
        return;
      }

      const res = await fetch("/api/auth/phone/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${verifiedToken}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "فشل تعيين كلمة المرور");
        setSettingPassword(false);
        return;
      }

      if (isNewUser) {
        setStep("name");
        setSettingPassword(false);
        return;
      }

      setStep("success");
      setTimeout(() => onVerified(verifiedToken), 2000);
    } catch {
      setError("تعذر الاتصال — تحقق من الإنترنت");
      setSettingPassword(false);
    }
  }

  function handleSkipPassword() {
    if (isNewUser) {
      setStep("name");
    } else {
      setStep("success");
      setTimeout(() => onVerified(verifiedToken), 2000);
    }
  }

  async function handleResend() {
    setCanResend(false);
    setError("");
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(deviceId ? { "X-Device-Id": deviceId } : {}),
        },
        body: JSON.stringify({ phone: fullPhone }),
      });
      if (res.status === 429) {
        const data = await res.json();
        if (data.error === "DEVICE_BLOCKED") {
          setBlocked(true);
          setBlockMessage(data.message || "تم حظرك مؤقتاً — حاول لاحقاً");
        } else {
          setError(data.message || "انتظر قليلاً قبل المحاولة مرة أخرى");
          setCanResend(true);
        }
        return;
      }
      if (res.ok) {
        startCountdown();
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      } else {
        const data = await res.json();
        setError(data.message || "فشل إعادة الإرسال");
        setCanResend(true);
      }
    } catch {
      setError("تعذر الاتصال");
      setCanResend(true);
    }
  }

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && step === "phone") onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className={`
          relative w-full sm:max-w-md sm:mx-4
          bg-surface rounded-t-3xl sm:rounded-2xl
          shadow-2xl overflow-hidden
          transform transition-transform duration-300
          ${open ? "translate-y-0" : "translate-y-full"}
          max-h-[90vh] flex flex-col
        `}
      >
        <div className="relative flex items-center justify-center px-4 pt-3 pb-0">
          <div className="w-9 h-1 bg-border rounded-full sm:hidden" />
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 top-3 w-9 h-9 rounded-full bg-fog border border-border flex items-center justify-center text-mist hover:bg-border hover:text-ink transition-colors flex-shrink-0 z-10"
            aria-label="إغلاق"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {reason && (
          <div className="mx-6 mt-3 flex items-center gap-2.5 bg-olive-pale border border-olive-mid/40 rounded-xl px-3.5 py-2.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
            </svg>
            <p className="text-[12px] font-semibold text-olive leading-snug">{reason}</p>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-6 pb-8 pt-2">
          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 py-4">
            <div className={`h-[7px] rounded-full transition-all duration-300 ${step === "phone" ? "w-[22px] bg-olive" : "w-[7px] bg-confirm"}`} />
            <div className={`h-[7px] rounded-full transition-all duration-300 ${step === "otp" ? "w-[22px] bg-olive" : step === "password" || step === "name" || step === "success" ? "w-[7px] bg-confirm" : "w-[7px] bg-border"}`} />
            <div className={`h-[7px] rounded-full transition-all duration-300 ${step === "password" ? "w-[22px] bg-olive" : step === "name" || step === "success" ? "w-[7px] bg-confirm" : "w-[7px] bg-border"}`} />
            <div className={`h-[7px] rounded-full transition-all duration-300 ${step === "name" ? "w-[22px] bg-olive" : step === "success" ? "w-[7px] bg-confirm" : "w-[7px] bg-border"}`} />
          </div>

          {/* BLOCKED */}
          {blocked && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)", boxShadow: "0 8px 24px rgba(239,68,68,0.3)" }}
                >
                  <IconBan />
                </div>
              </div>
              <h2 className="font-display font-extrabold text-xl text-ink text-center mb-2">تم حظرك مؤقتاً</h2>
              <p className="text-[13px] text-mist text-center leading-relaxed mb-5">{blockMessage}</p>
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                <p className="text-[12px] text-red-600 leading-relaxed">لأسباب أمنية، تم تقييد محاولات التحقق من هذا الجهاز. يرجى المحاولة مرة أخرى لاحقاً.</p>
              </div>
              <button type="button" onClick={onClose} className="w-full py-[15px] rounded-[14px] bg-border font-display font-bold text-[15px] text-ink transition-all duration-150 hover:bg-fog active:scale-[0.98]">
                إغلاق
              </button>
            </div>
          )}

          {/* STEP 1: Phone */}
          {step === "phone" && !blocked && (
            <div>
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, #4A7C59, #3A6347)", boxShadow: "0 8px 24px rgba(74,124,89,0.3)" }}
                >
                  {authMode === "login" ? <IconWave /> : authMode === "forgot" ? <IconKey /> : <IconUserPlus />}
                </div>
              </div>

              <h2 className="font-display font-extrabold text-xl text-ink text-center mb-1.5">
                {authMode === "login" ? "تسجيل الدخول" : authMode === "forgot" ? "استعادة كلمة المرور" : "إنشاء حساب جديد"}
              </h2>
              <p className="text-[13px] text-mist text-center leading-relaxed mb-5">
                {authMode === "login"
                  ? "أدخل رقمك وكلمة المرور للدخول"
                  : authMode === "forgot"
                  ? "سنرسل لك كود تحقق لإعادة تعيين كلمة المرور"
                  : "سنرسل كود تحقق لمرة واحدة ثم تختار كلمة مرور"}
              </p>

              {/* Phone input */}
              <div
                className={`
                  flex items-stretch border-[1.5px] rounded-[14px] overflow-hidden bg-surface mb-3
                  transition-all duration-150
                  ${error && shake ? "border-[#C0622A] shadow-[0_0_0_3px_rgba(192,98,42,0.12)]" : "border-border focus-within:border-olive focus-within:shadow-[0_0_0_3px_rgba(74,124,89,0.12)]"}
                  ${shake ? "animate-[shake_0.4s_ease]" : ""}
                `}
              >
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-local"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => {
                    const normalized = e.target.value.replace(/[٠-٩]/g, (d: string) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
                    setPhone(normalized.replace(/\D/g, "").slice(0, 10));
                    setError("");
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !sending) { authMode === "login" ? handleLogin() : handleSendOtp(); } }}
                  placeholder="059 000 0000"
                  maxLength={10}
                  className="flex-1 border-none outline-none py-3.5 px-3.5 font-body text-base text-ink bg-transparent text-right tracking-wide placeholder:text-mist"
                />
                <div className="flex items-center gap-1 px-2.5 border-r-[1.5px] border-border bg-fog shrink-0 relative">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value as "970" | "972")}
                    className="font-body text-sm font-semibold text-ink bg-transparent outline-none appearance-none cursor-pointer pl-3 pr-1"
                    dir="ltr"
                  >
                    <option value="970">+970</option>
                    <option value="972">+972</option>
                  </select>
                  <span className="text-sm text-mist pointer-events-none">▾</span>
                </div>
              </div>

              {/* Password input (login mode) */}
              {authMode === "login" && (
                <div
                  className={`
                    flex items-stretch border-[1.5px] rounded-[14px] overflow-hidden bg-surface mb-3
                    transition-all duration-150
                    ${error && shake ? "border-[#C0622A] shadow-[0_0_0_3px_rgba(192,98,42,0.12)]" : "border-border focus-within:border-olive focus-within:shadow-[0_0_0_3px_rgba(74,124,89,0.12)]"}
                  `}
                >
                  <input
                    type={showPassword ? "text" : "password"}
                    dir="rtl"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !sending) handleLogin(); }}
                    placeholder="كلمة المرور"
                    autoComplete="current-password"
                    className="flex-1 border-none outline-none py-3.5 px-3.5 font-body text-base text-ink bg-transparent placeholder:text-mist"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="w-[52px] flex items-center justify-center text-mist hover:text-ink transition-colors border-r-[1.5px] border-border bg-fog shrink-0"
                  >
                    {showPassword ? <IconEyeOff className="w-[18px] h-[18px]" /> : <IconEye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              )}

              {/* Forgot password */}
              {authMode === "login" && (
                <div className="text-left mb-4">
                  <button
                    type="button"
                    onClick={() => { setAuthMode("forgot"); setError(""); setPassword(""); }}
                    className="text-[12px] text-olive font-semibold hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              {/* WhatsApp hint for register/forgot */}
              {authMode !== "login" && (
                <div className="flex items-center gap-1.5 text-[11px] text-mist mb-5">
                  سيصلك رسالة على
                  <span className="inline-flex items-center gap-1 bg-[#E8FBF0] text-[#1DAA58] font-semibold text-[10px] px-2 py-0.5 rounded-full border border-[#B8EDD0]">
                    <IconWhatsApp className="w-3 h-3" /> WhatsApp
                  </span>
                  فقط
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="text-center mb-3">
                  <p className="text-xs text-[#C0622A] font-semibold">{error}</p>
                  {retryCountdown > 0 && (
                    <p className="text-[11px] text-mist mt-1">
                      يمكنك المحاولة بعد <strong className="text-ink">{Math.floor(retryCountdown / 60)}:{(retryCountdown % 60).toString().padStart(2, "0")}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Action button */}
              {authMode === "login" ? (
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={sending || retryCountdown > 0}
                  className={`
                    w-full py-[15px] rounded-[14px] bg-olive font-display font-bold text-[15px] text-white
                    flex items-center justify-center gap-2
                    shadow-[0_4px_16px_rgba(74,124,89,0.25)]
                    transition-all duration-150
                    ${sending ? "opacity-70 pointer-events-none" : "hover:bg-olive-deep active:scale-[0.98]"}
                  `}
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                      <span className="opacity-70">جاري الدخول...</span>
                    </>
                  ) : (
                    <span>تسجيل الدخول</span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sending || retryCountdown > 0}
                  className={`
                    w-full py-[15px] rounded-[14px] font-display font-bold text-[15px] text-white
                    flex items-center justify-center gap-2
                    transition-all duration-150
                    shadow-[0_4px_16px_rgba(37,211,102,0.28)]
                    ${sending ? "opacity-70 pointer-events-none" : "hover:brightness-95 active:scale-[0.98]"}
                  `}
                  style={{ background: "#25D366" }}
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                      <span className="opacity-70">جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <IconWhatsApp className="w-[17px] h-[17px]" />
                      <span>{authMode === "forgot" ? "إرسال كود الاستعادة" : "إرسال كود التحقق"}</span>
                    </>
                  )}
                </button>
              )}

              {/* Toggle login/register */}
              <div className="text-center mt-4">
                {authMode === "login" ? (
                  <p className="text-[12px] text-mist">
                    ليس لديك حساب؟{" "}
                    <button type="button" onClick={() => { setAuthMode("register"); setError(""); setPassword(""); }} className="text-olive font-semibold hover:underline">
                      إنشاء حساب
                    </button>
                  </p>
                ) : authMode === "register" ? (
                  <p className="text-[12px] text-mist">
                    لديك حساب؟{" "}
                    <button type="button" onClick={() => { setAuthMode("login"); setError(""); }} className="text-olive font-semibold hover:underline">
                      تسجيل الدخول
                    </button>
                  </p>
                ) : (
                  <p className="text-[12px] text-mist">
                    <button type="button" onClick={() => { setAuthMode("login"); setError(""); setPassword(""); }} className="text-olive font-semibold hover:underline">
                      العودة لتسجيل الدخول
                    </button>
                  </p>
                )}
              </div>

              <p className="text-[11px] text-mist text-center leading-relaxed mt-3">
                بالمتابعة توافق على{" "}
                <span className="text-olive">شروط الاستخدام</span> و{" "}
                <span className="text-olive">سياسة الخصوصية</span>
              </p>
            </div>
          )}

          {/* STEP 2: OTP */}
          {step === "otp" && (
            <div>
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 8px 24px rgba(37,211,102,0.3)" }}
                >
                  <IconMessage />
                </div>
              </div>

              <h2 className="font-display font-extrabold text-xl text-ink text-center mb-3">تحقق من رقمك</h2>

              <div className="flex items-center justify-between bg-fog border-[1.5px] border-border rounded-xl px-3.5 py-2.5 mb-5">
                <span className="font-body text-[15px] font-semibold text-ink tracking-wide" dir="ltr">{formattedPhone}</span>
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); setError(""); if (countdownRef.current) clearInterval(countdownRef.current); }}
                  className="text-xs text-olive font-semibold"
                >
                  تغيير
                </button>
              </div>

              <p className="text-[13px] text-mist text-center leading-relaxed mb-5">
                أرسلنا كود مكوّن من <strong className="text-slate font-semibold">6 أرقام</strong> لـ WhatsApp الخاص بك
              </p>

              <div
                className={`flex gap-2 justify-center mb-2.5 ${shake ? "animate-[shake_0.4s_ease]" : ""}`}
                dir="ltr"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, i) => (
                  <div key={i} className="contents">
                    {i === 3 && <div className="w-2 shrink-0" />}
                    <input
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`
                        w-[46px] h-[56px] border-[1.5px] rounded-xl
                        text-[22px] font-display font-bold text-center outline-none
                        transition-all duration-150
                        ${error ? "border-[#C0622A] bg-[#FBF0EB]" : digit ? "border-olive-mid bg-olive-pale text-olive-deep" : "border-border bg-fog text-ink"}
                        focus:border-olive focus:shadow-[0_0_0_3px_rgba(74,124,89,0.12)] focus:bg-surface
                      `}
                      style={{ caretColor: "#4A7C59" }}
                    />
                  </div>
                ))}
              </div>

              {error && <p className="text-center text-xs text-[#C0622A] font-semibold mb-2.5 min-h-[18px]">{error}</p>}

              <div className="text-center text-xs text-mist mb-5 min-h-[20px]">
                {canResend ? (
                  <button type="button" onClick={handleResend} className="text-olive font-semibold underline">إعادة إرسال الكود</button>
                ) : (
                  <>إعادة الإرسال خلال <strong>{formatCountdown(countdown)}</strong></>
                )}
              </div>

              <button
                type="button"
                onClick={() => { const code = otp.join(""); if (code.length === 6) handleOtpComplete(code); }}
                disabled={verifying || otp.join("").length < 6}
                className={`
                  w-full py-[15px] rounded-[14px] bg-olive font-display font-bold text-[15px] text-white
                  flex items-center justify-center gap-2
                  shadow-[0_4px_16px_rgba(74,124,89,0.25)]
                  transition-all duration-150
                  ${verifying ? "opacity-70 pointer-events-none" : "hover:bg-olive-deep active:scale-[0.98]"}
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                {verifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                    <span className="opacity-70">جاري التحقق...</span>
                  </>
                ) : (
                  <span>تحقق</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); setError(""); if (countdownRef.current) clearInterval(countdownRef.current); }}
                className="w-full py-2.5 text-[13px] text-slate hover:text-ink hover:bg-fog rounded-lg transition-colors mt-2"
              >
                تغيير الرقم
              </button>
            </div>
          )}

          {/* STEP 3: Set Password */}
          {step === "password" && (
            <div>
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, #4A7C59, #3A6347)", boxShadow: "0 8px 24px rgba(74,124,89,0.3)" }}
                >
                  <IconLock />
                </div>
              </div>

              <h2 className="font-display font-extrabold text-xl text-ink text-center mb-1.5">
                {authMode === "forgot" ? "كلمة مرور جديدة" : "اختر كلمة مرور"}
              </h2>
              <p className="text-[13px] text-mist text-center leading-relaxed mb-5">
                {authMode === "forgot"
                  ? "أدخل كلمة المرور الجديدة لحسابك"
                  : "ستستخدمها للدخول في المرات القادمة بدون كود"}
              </p>

              <div
                className={`
                  flex items-stretch border-[1.5px] rounded-[14px] overflow-hidden bg-surface mb-3
                  transition-all duration-150
                  ${error && shake ? "border-[#C0622A] shadow-[0_0_0_3px_rgba(192,98,42,0.12)]" : "border-border focus-within:border-olive focus-within:shadow-[0_0_0_3px_rgba(74,124,89,0.12)]"}
                  ${shake ? "animate-[shake_0.4s_ease]" : ""}
                `}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  dir="rtl"
                  autoFocus
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !settingPassword) handleSetPassword(); }}
                  placeholder="كلمة المرور (6 أحرف على الأقل)"
                  autoComplete="new-password"
                  className="flex-1 border-none outline-none py-3.5 px-3.5 font-body text-base text-ink bg-transparent placeholder:text-mist"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-[52px] flex items-center justify-center text-mist hover:text-ink transition-colors border-r-[1.5px] border-border bg-fog shrink-0"
                >
                  {showPassword ? <IconEyeOff className="w-[18px] h-[18px]" /> : <IconEye className="w-[18px] h-[18px]" />}
                </button>
              </div>

              <p className="text-[11px] text-mist mb-4">يجب أن تكون 6 أحرف على الأقل</p>

              {error && <p className="text-center text-xs text-[#C0622A] font-semibold mb-3">{error}</p>}

              <button
                type="button"
                onClick={handleSetPassword}
                disabled={settingPassword}
                className={`
                  w-full py-[15px] rounded-[14px] bg-olive font-display font-bold text-[15px] text-white
                  flex items-center justify-center gap-2
                  shadow-[0_4px_16px_rgba(74,124,89,0.25)]
                  transition-all duration-150
                  ${settingPassword ? "opacity-70 pointer-events-none" : "hover:bg-olive-deep active:scale-[0.98]"}
                `}
              >
                {settingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                    <span className="opacity-70">جاري الحفظ...</span>
                  </>
                ) : (
                  <span>{authMode === "forgot" ? "تغيير كلمة المرور" : "حفظ كلمة المرور"}</span>
                )}
              </button>

              {!isNewUser && authMode !== "forgot" && (
                <button
                  type="button"
                  onClick={handleSkipPassword}
                  className="w-full py-2.5 text-[13px] text-slate hover:text-ink hover:bg-fog rounded-lg transition-colors mt-2"
                >
                  تخطي — سأضيفها لاحقاً
                </button>
              )}
            </div>
          )}

          {/* STEP 4: Name */}
          {step === "name" && (
            <div>
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, #4A7C59, #3A6347)", boxShadow: "0 8px 24px rgba(74,124,89,0.3)" }}
                >
                  <IconEdit />
                </div>
              </div>

              <h2 className="font-display font-extrabold text-xl text-ink text-center mb-1.5">ما اسمك؟</h2>
              <p className="text-[13px] text-mist text-center leading-relaxed mb-5">سيظهر اسمك بجانب الأسعار التي تشاركها</p>

              <input
                type="text"
                dir="rtl"
                autoFocus
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value.slice(0, 30)); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !savingName) handleSaveName(); }}
                placeholder="اسمك"
                maxLength={30}
                className={`w-full border-[1.5px] rounded-[14px] px-4 py-3.5 font-body text-base text-ink bg-surface outline-none mb-3 placeholder:text-mist focus:border-olive focus:shadow-[0_0_0_3px_rgba(74,124,89,0.12)] transition-all duration-150 ${
                  error && shake ? "border-[#C0622A]" : "border-border"
                } ${shake ? "animate-[shake_0.4s_ease]" : ""}`}
              />

              {error && <p className="text-center text-xs text-[#C0622A] font-semibold mb-3">{error}</p>}

              <button
                type="button"
                onClick={handleSaveName}
                disabled={savingName}
                className={`
                  w-full py-[15px] rounded-[14px] bg-olive font-display font-bold text-[15px] text-white
                  flex items-center justify-center gap-2
                  shadow-[0_4px_16px_rgba(74,124,89,0.25)]
                  transition-all duration-150
                  ${savingName ? "opacity-70 pointer-events-none" : "hover:bg-olive-deep active:scale-[0.98]"}
                `}
              >
                {savingName ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                    <span className="opacity-70">جاري الحفظ...</span>
                  </>
                ) : (
                  <span>متابعة</span>
                )}
              </button>
            </div>
          )}

          {/* STEP 5: Success */}
          {step === "success" && (
            <div className="text-center py-2">
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full border-2 border-confirm animate-[ring-expand_0.5s_ease_forwards]" />
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg animate-[pop-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
                  style={{ background: "linear-gradient(135deg, #2D9E5F, #25825A)", boxShadow: "0 8px 28px rgba(45,158,95,0.35)" }}
                >
                  <IconCheck />
                </div>
              </div>

              <h2 className="font-display font-extrabold text-[22px] text-ink mb-1.5">
                {mode === "login" ? "تم تسجيل الدخول!" : "تم التحقق!"}
              </h2>
              <p className="text-[13px] text-mist leading-relaxed mb-6">
                {mode === "login"
                  ? "مرحباً بك — حسابك جاهز الآن"
                  : "رقمك مسجّل — سعرك يُرسل الآن"}
                <br />
                <span className="text-[11px]">ستدخل في المرات القادمة بكلمة المرور فقط</span>
              </p>

              {mode === "submit" && (
                <>
                  <div className="flex items-center gap-2.5 bg-fog border-[1.5px] border-border rounded-xl p-3.5 mb-2">
                    <div className="w-[18px] h-[18px] border-2 border-olive-mid border-t-olive rounded-full animate-spin shrink-0" />
                    <div className="flex-1 text-right">
                      <div className="text-[13px] font-semibold text-slate">جاري نشر السعر...</div>
                      {priceDetails && (
                        <div className="text-[11px] text-mist mt-0.5">
                          {priceDetails.productName}
                          {priceDetails.price && ` — ${priceDetails.price} ₪`}
                          {priceDetails.areaName && ` — ${priceDetails.areaName}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-mist text-center mt-1.5">ستُغلق هذه النافذة تلقائياً بعد النشر</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes ring-expand {
          from { transform: scale(0.5); opacity: 0.8; }
          to { transform: scale(1.2); opacity: 0; }
        }
        @keyframes pop-in {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}
