"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { setStoredToken } from "@/lib/auth/token";
import { apiFetch } from "@/lib/api/fetch";

type Step = "phone" | "otp" | "success";

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
}

export function PhoneAuthPopup({
  open,
  onClose,
  onVerified,
  priceDetails,
}: PhoneAuthPopupProps) {
  const [step, setStep] = useState<Step>("phone");
  const [countryCode, setCountryCode] = useState<"970" | "972">("970");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(90);
  const [canResend, setCanResend] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when popup opens
  useEffect(() => {
    if (open) {
      setStep("phone");
      setCountryCode("970");
      setPhone("");
      setOtp(["", "", "", "", "", ""]);
      setSending(false);
      setVerifying(false);
      setError("");
      setShake(false);
      setCountdown(90);
      setCanResend(false);
      setTimeout(() => phoneInputRef.current?.focus(), 300);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [open]);

  // Countdown timer for OTP step
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

  // Format phone for display
  const formattedPhone = phone
    ? `+${countryCode} ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`
    : "";

  // Full phone with country code for API
  const stripped = phone.startsWith("0") ? phone.slice(1) : phone;
  const fullPhone = `${countryCode}${stripped}`;

  // ── Step 1: Send OTP ──
  async function handleSendOtp() {
    const cleaned = phone.replace(/\D/g, "");
    const local = cleaned.startsWith("0") ? cleaned : `0${cleaned}`;
    if (!/^(059|056)\d{7}$/.test(local)) {
      setError("رقم الهاتف غير صحيح — يجب أن يبدأ بـ 059 أو 056 ويتكون من 10 أرقام");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setSending(true);
    setError("");

    try {
      const res = await apiFetch("/api/auth/phone/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "فشل إرسال الرمز");
        setSending(false);
        return;
      }

      setStep("otp");
      startCountdown();
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch {
      setError("تعذر الاتصال — تحقق من الإنترنت");
    } finally {
      setSending(false);
    }
  }

  // ── Step 2: OTP input handlers ──
  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (digit && index === 5) {
      const code = [...newOtp.slice(0, 5), digit].join("");
      if (code.length === 6) {
        handleVerifyOtp(code);
      }
    } else {
      const code = newOtp.join("");
      if (code.length === 6) {
        handleVerifyOtp(code);
      }
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
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
      handleVerifyOtp(pasted);
    }
  }

  // ── Step 2: Verify OTP ──
  async function handleVerifyOtp(code: string) {
    setVerifying(true);
    setError("");

    try {
      const res = await apiFetch("/api/auth/phone/verify-otp", {
        method: "POST",
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

      // Store new token
      const token = data.access_token;
      setStoredToken(token);

      // Move to success step
      setStep("success");

      // Auto-submit after short delay
      setTimeout(() => {
        onVerified(token);
      }, 2000);
    } catch {
      setError("تعذر الاتصال — تحقق من الإنترنت");
      setVerifying(false);
    }
  }

  // ── Resend OTP ──
  async function handleResend() {
    setCanResend(false);
    setError("");
    try {
      const res = await apiFetch("/api/auth/phone/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone: fullPhone }),
      });
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
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && step === "phone") onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Popup */}
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
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="w-9 h-1 bg-border rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-8 pt-2">
          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 py-4">
            <div
              className={`h-[7px] rounded-full transition-all duration-300 ${
                step === "phone"
                  ? "w-[22px] bg-olive"
                  : "w-[7px] bg-confirm"
              }`}
            />
            <div
              className={`h-[7px] rounded-full transition-all duration-300 ${
                step === "otp"
                  ? "w-[22px] bg-olive"
                  : step === "success"
                  ? "w-[7px] bg-confirm"
                  : "w-[7px] bg-border"
              }`}
            />
            <div
              className={`h-[7px] rounded-full transition-all duration-300 ${
                step === "success"
                  ? "w-[22px] bg-olive"
                  : "w-[7px] bg-border"
              }`}
            />
          </div>

          {/* ═══ STEP 1: Phone Number ═══ */}
          {step === "phone" && (
            <div>
              {/* WA Icon */}
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-[20px] flex items-center justify-center text-3xl shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    boxShadow: "0 8px 24px rgba(37,211,102,0.3)",
                  }}
                >
                  📱
                </div>
              </div>

              <h2 className="font-display font-extrabold text-xl text-ink text-center mb-1.5">
                أدخل رقم هاتفك
              </h2>
              <p className="text-[13px] text-mist text-center leading-relaxed mb-6">
                سنرسل لك كود تحقق مجاني عبر{" "}
                <strong className="text-slate font-semibold">WhatsApp</strong>
                {" "}لنشر سعرك مباشرةً
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
                <div className="flex items-center gap-1 px-2.5 border-l-[1.5px] border-border bg-fog shrink-0 relative">
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
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setError("");
                  }}
                  placeholder="059 000 0000"
                  maxLength={10}
                  className="flex-1 border-none outline-none py-3.5 px-3.5 font-body text-base text-ink bg-transparent text-right tracking-wide placeholder:text-mist"
                />
              </div>

              {/* Hint */}
              <div className="flex items-center gap-1.5 text-[11px] text-mist mb-5">
                سيصلك رسالة على
                <span className="inline-flex items-center gap-1 bg-[#E8FBF0] text-[#1DAA58] font-semibold text-[10px] px-2 py-0.5 rounded-full border border-[#B8EDD0]">
                  💬 WhatsApp
                </span>
                فقط
              </div>

              {/* WA message preview */}
              <div className="flex gap-2.5 bg-[#E8FBF0] border border-[#B8EDD0] rounded-xl p-3 mb-5">
                <span className="text-xl shrink-0 mt-0.5">💬</span>
                <div className="text-xs text-[#1A6B3A] leading-relaxed">
                  <strong className="block font-bold text-[13px] mb-0.5">
                    GazaPriceWatch سيرسل لك:
                  </strong>
                  &quot;كود التحقق: <strong>XXXXXX</strong> — لا تشاركه مع أحد.
                  صالح 5 دقائق.&quot;
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-center text-xs text-[#C0622A] font-semibold mb-3">
                  {error}
                </p>
              )}

              {/* Send button */}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sending}
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
                    <span className="text-[17px]">💬</span>
                    <span>إرسال الكود عبر WhatsApp</span>
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="text-[11px] text-mist text-center leading-relaxed mt-3">
                بالمتابعة توافق على{" "}
                <span className="text-olive">شروط الاستخدام</span> و{" "}
                <span className="text-olive">سياسة الخصوصية</span>
              </p>
            </div>
          )}

          {/* ═══ STEP 2: OTP ═══ */}
          {step === "otp" && (
            <div>
              {/* WA Icon */}
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-[20px] flex items-center justify-center text-3xl shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    boxShadow: "0 8px 24px rgba(37,211,102,0.3)",
                  }}
                >
                  💬
                </div>
              </div>

              <h2 className="font-display font-extrabold text-xl text-ink text-center mb-3">
                تحقق من رقمك
              </h2>

              {/* Phone chip */}
              <div className="flex items-center justify-between bg-fog border-[1.5px] border-border rounded-xl px-3.5 py-2.5 mb-5">
                <span className="font-body text-[15px] font-semibold text-ink tracking-wide" dir="ltr">
                  {formattedPhone}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                    if (countdownRef.current) clearInterval(countdownRef.current);
                  }}
                  className="text-xs text-olive font-semibold"
                >
                  تغيير
                </button>
              </div>

              <p className="text-[13px] text-mist text-center leading-relaxed mb-5">
                أرسلنا كود مكوّن من <strong className="text-slate font-semibold">6 أرقام</strong> لـ WhatsApp الخاص بك
              </p>

              {/* OTP boxes — LTR with gap in middle */}
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
                        ${
                          error
                            ? "border-[#C0622A] bg-[#FBF0EB]"
                            : digit
                            ? "border-olive-mid bg-olive-pale text-olive-deep"
                            : "border-border bg-fog text-ink"
                        }
                        focus:border-olive focus:shadow-[0_0_0_3px_rgba(74,124,89,0.12)] focus:bg-surface
                      `}
                      style={{ caretColor: "#4A7C59" }}
                    />
                  </div>
                ))}
              </div>

              {/* Error message */}
              {error && (
                <p className="text-center text-xs text-[#C0622A] font-semibold mb-2.5 min-h-[18px]">
                  {error}
                </p>
              )}

              {/* Timer / Resend */}
              <div className="text-center text-xs text-mist mb-5 min-h-[20px]">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-olive font-semibold underline"
                  >
                    إعادة إرسال الكود
                  </button>
                ) : (
                  <>
                    إعادة الإرسال خلال{" "}
                    <strong>{formatCountdown(countdown)}</strong>
                  </>
                )}
              </div>

              {/* Verify button */}
              <button
                type="button"
                onClick={() => {
                  const code = otp.join("");
                  if (code.length === 6) handleVerifyOtp(code);
                }}
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
                  <>
                    <span className="text-[17px]">✓</span>
                    <span>تحقق وأرسل السعر</span>
                  </>
                )}
              </button>

              {/* Go back */}
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtp(["", "", "", "", "", ""]);
                  setError("");
                  if (countdownRef.current) clearInterval(countdownRef.current);
                }}
                className="w-full py-2.5 text-[13px] text-slate hover:text-ink hover:bg-fog rounded-lg transition-colors mt-2"
              >
                ‹ تغيير الرقم
              </button>
            </div>
          )}

          {/* ═══ STEP 3: Success ═══ */}
          {step === "success" && (
            <div className="text-center py-2">
              {/* Success animation */}
              <div className="relative w-20 h-20 mx-auto mb-5">
                <div
                  className="absolute inset-0 rounded-full border-2 border-confirm animate-[ring-expand_0.5s_ease_forwards]"
                />
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg animate-[pop-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
                  style={{
                    background: "linear-gradient(135deg, #2D9E5F, #25825A)",
                    boxShadow: "0 8px 28px rgba(45,158,95,0.35)",
                  }}
                >
                  ✓
                </div>
              </div>

              <h2 className="font-display font-extrabold text-[22px] text-ink mb-1.5">
                تم التحقق! 🎉
              </h2>
              <p className="text-[13px] text-mist leading-relaxed mb-6">
                رقمك مسجّل — سعرك يُرسل الآن
                <br />
                بدون الحاجة للتحقق مرة أخرى
              </p>

              {/* Auto-submit progress */}
              <div className="flex items-center gap-2.5 bg-fog border-[1.5px] border-border rounded-xl p-3.5 mb-2">
                <div className="w-[18px] h-[18px] border-2 border-olive-mid border-t-olive rounded-full animate-spin shrink-0" />
                <div className="flex-1 text-right">
                  <div className="text-[13px] font-semibold text-slate">
                    جاري نشر السعر...
                  </div>
                  {priceDetails && (
                    <div className="text-[11px] text-mist mt-0.5">
                      {priceDetails.productName}
                      {priceDetails.price && ` — ${priceDetails.price} ₪`}
                      {priceDetails.areaName && ` — ${priceDetails.areaName}`}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-mist text-center mt-1.5">
                ستُغلق هذه النافذة تلقائياً بعد النشر
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Keyframe animations */}
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
    </div>
  );
}
