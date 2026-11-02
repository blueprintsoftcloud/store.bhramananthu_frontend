// src/components/CustomerAuthModal.tsx
// Modal for customer auth with two modes:
//   Sign In:  phone → OTP → login  (404 = offer to create account)
//   Register: name + email + phone → OTP → register → auto-login

import { useState, useEffect, useCallback, useRef } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import {
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  SparklesIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { ClipLoader } from "react-spinners";
import OtpInput from "react-otp-input";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import panakkalLogo from "../assets/Panakkallogo.png";

// ── Brand tokens ─────────────────────────────────────────────────────────────
const DEEP_TEAL = "#0B6B6B";

// ── MSG91 Widget Configuration (Fetched dynamically from backend at runtime) ───
let cachedMsg91Config: { widgetId: string; tokenAuth: string } | null = null;
let pendingConfigPromise: Promise<{ widgetId: string; tokenAuth: string }> | null = null;

const fetchMsg91Config = async (): Promise<{ widgetId: string; tokenAuth: string }> => {
  if (cachedMsg91Config && cachedMsg91Config.widgetId && cachedMsg91Config.tokenAuth) {
    return cachedMsg91Config;
  }
  if (pendingConfigPromise) {
    return pendingConfigPromise;
  }
  pendingConfigPromise = api
    .get("/auth/mobile/widget-config")
    .then((res) => {
      cachedMsg91Config = {
        widgetId: res.data?.widgetId || (import.meta.env.VITE_MSG91_WIDGET_ID as string) || "",
        tokenAuth: res.data?.tokenAuth || (import.meta.env.VITE_MSG91_TOKEN_AUTH as string) || "",
      };
      return cachedMsg91Config;
    })
    .catch((err) => {
      console.warn("Could not fetch MSG91 config from backend, using env fallback", err);
      return {
        widgetId: (import.meta.env.VITE_MSG91_WIDGET_ID as string) || "",
        tokenAuth: (import.meta.env.VITE_MSG91_TOKEN_AUTH as string) || "",
      };
    })
    .finally(() => {
      pendingConfigPromise = null;
    });

  return pendingConfigPromise;
};

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode = "sign-in" | "register";
type Step = "form" | "otp";

// ── OTP input style ───────────────────────────────────────────────────────────
const OTP_CLASS =
  "!w-12 !h-12 sm:!w-13 sm:!h-13 border border-slate-300 rounded-xl text-center " +
  "text-lg sm:text-xl font-bold text-slate-900 bg-white focus:outline-none " +
  "focus:border-[#0B6B6B] focus:ring-4 focus:ring-[#0B6B6B]/15 shadow-2xs transition-all duration-200";

interface Props {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
}

export default function CustomerAuthModal({ open, onClose, initialMode = "sign-in" }: Props) {
  const { checkAuthStatus } = useAuth();
  useBodyScrollLock(open);

  const [mode, setMode] = useState<Mode>("sign-in");
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [takingLong, setTakingLong] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Form fields
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Inline phone validation error
  const [phoneError, setPhoneError] = useState("");

  // Blocked state — set when the entered phone belongs to an admin account
  const [adminBlocked, setAdminBlocked] = useState(false);

  // OTP
  const [otp, setOtp] = useState("");
  const [reqId, setReqId] = useState("");
  const [timer, setTimer] = useState(0);

  // Refs for request cancellation & Enter key focus navigation
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isVerifyingRef = useRef(false);
  const takingLongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTakingLongTimer = () => {
    if (takingLongTimerRef.current) {
      clearTimeout(takingLongTimerRef.current);
      takingLongTimerRef.current = null;
    }
  };

  // Pre-fetch MSG91 configuration from backend on modal open, and always reset to Sign In mode
  useEffect(() => {
    if (open) {
      setMode(initialMode || "sign-in");
      setStep("form");
      setPhone("");
      setName("");
      setEmail("");
      setOtp("");
      setPhoneError("");
      setVerifyError("");
      setAdminBlocked(false);
      fetchMsg91Config();
    }
  }, [open, initialMode]);

  // Clean up timers & abort requests on unmount
  useEffect(() => {
    return () => {
      clearTakingLongTimer();
      abortControllerRef.current?.abort();
    };
  }, []);

  // ── Timer countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const formatTimer = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Reset state ────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearTakingLongTimer();
    setStep("form");
    setPhone("");
    setName("");
    setEmail("");
    setOtp("");
    setReqId("");
    setTimer(0);
    setPhoneError("");
    setVerifyError("");
    setTakingLong(false);
    setAdminBlocked(false);
    isVerifyingRef.current = false;
  }, []);

  const handleClose = () => {
    reset();
    setMode("sign-in");
    onClose();
  };

  const switchMode = (m: Mode) => { reset(); setMode(m); };

  // ── Cancel ongoing verification ────────────────────────────────────────────
  const handleCancelVerification = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearTakingLongTimer();
    setLoading(false);
    setTakingLong(false);
    isVerifyingRef.current = false;
    setVerifyError("Verification cancelled. Please enter the OTP again or click Resend.");
    toast("Verification stopped. You can retry.", { icon: "ℹ️", id: "verify-cancelled" });
  }, []);

  // ── Phone validation helper ─────────────────────────────────────────────────
  const validatePhone = (value: string): boolean => {
    if (value.trim().length === 0) {
      setPhoneError("Mobile number is required");
      return false;
    }
    if (value.trim().length !== 10) {
      setPhoneError("Mobile number must be exactly 10 digits");
      return false;
    }
    if (!/^[6-9][0-9]{9}$/.test(value.trim())) {
      setPhoneError("Enter a valid Indian mobile number (starts with 6–9)");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    // Clear error live once user has a valid 10-digit number
    if (phoneError) {
      if (digits.length === 10 && /^[6-9][0-9]{9}$/.test(digits)) {
        setPhoneError("");
      } else if (digits.length < 10) {
        setPhoneError("");
      }
    }
  };

  // ── MSG91 browser call with timeout protection ──────────────────────────────
  const callMsg91 = async (
    endpoint: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
    timeoutMs = 15000,
  ) => {
    const config = await fetchMsg91Config();
    const internalController = new AbortController();
    const timerId = setTimeout(() => {
      internalController.abort();
    }, timeoutMs);

    if (signal) {
      if (signal.aborted) {
        clearTimeout(timerId);
        return { type: "error", message: "Request cancelled." };
      }
      signal.addEventListener("abort", () => internalController.abort(), { once: true });
    }

    try {
      const r = await fetch(`https://control.msg91.com/api/v5/widget/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenAuth: config.tokenAuth, widgetId: config.widgetId, ...body }),
        signal: internalController.signal,
      });
      clearTimeout(timerId);
      const text = await r.text();
      try {
        return JSON.parse(text) as { type: string; message?: string; [k: string]: unknown };
      } catch {
        return { type: "error", message: text };
      }
    } catch (err: unknown) {
      clearTimeout(timerId);
      const e = err as Error;
      if (e?.name === "AbortError" || internalController.signal.aborted || signal?.aborted) {
        return {
          type: "error",
          message: "Verification timed out due to slow network. Please try again or request a new OTP.",
        };
      }
      return { type: "error", message: e?.message || "Network error. Please try again." };
    }
  };

  // ── Step 1: Validate form + send OTP ──────────────────────────────────────
  const handleSendOtp = async () => {
    if (!validatePhone(phone)) return;
    if (mode === "register") {
      if (!name.trim() || name.trim().length < 2) {
        toast.error("Enter your full name (at least 2 characters)", { id: "name-invalid" });
        return;
      }
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        toast.error("Enter a valid email address", { id: "email-invalid" });
        return;
      }
    }
    try {
      setLoading(true);

      // For sign-in: verify the phone exists in the DB BEFORE wasting an OTP
      if (mode === "sign-in") {
        try {
          await api.post("/auth/mobile/check-phone", { phone: phone.trim() }, { timeout: 12000 });
        } catch (err: unknown) {
          const e = err as { response?: { data?: { message?: string; code?: string } } };
          const code = e?.response?.data?.code;
          if (code === "ADMIN_ROLE") {
            // Admin/superadmin accounts must use the Admin Portal — block silently
            setAdminBlocked(true);
          } else if (code === "NO_ACCOUNT") {
            toast.error("No account found with this number. Please create an account.", {
              id: "no-account",
              duration: 4000,
            });
            const savedPhone = phone;
            reset();
            setMode("register");
            setPhone(savedPhone);
          } else {
            toast.error(e?.response?.data?.message ?? "Could not verify number. Try again.", { id: "check-fail" });
          }
          return;
        }
      }

      const data = await callMsg91("sendOtp", { identifier: `91${phone.trim()}` }, undefined, 15000);
      if (data.type !== "success") {
        toast.error(data.message ?? "Failed to send OTP", { id: "otp-fail" });
        return;
      }
      // MSG91 sendOtp returns the reqId in data.message
      setReqId((data.message ?? "") as string);
      toast.success("OTP sent to your mobile!", { id: "otp-sent" });
      setOtp("");
      setVerifyError("");
      setStep("otp");
      setTimer(120); // 2 minutes resend cooldown
    } catch {
      toast.error("Failed to send OTP. Check your connection.", { id: "otp-fail" });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP → call backend login or register ───────────────────
  const handleVerifyOtp = async (customOtp?: string) => {
    const targetOtp = (customOtp ?? otp).trim();
    if (targetOtp.length !== 4) {
      toast.error("Enter the complete 4-digit OTP", { id: "otp-incomplete" });
      return;
    }

    if (isVerifyingRef.current) return;
    isVerifyingRef.current = true;

    // Cancel prior pending verification if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setVerifyError("");
    setLoading(true);
    setTakingLong(false);

    // If verification takes longer than 4.5s, surface helpful feedback + cancel option
    clearTakingLongTimer();
    takingLongTimerRef.current = setTimeout(() => {
      setTakingLong(true);
    }, 4500);

    try {
      // Browser verifies OTP with MSG91 → gets JWT access token (15s timeout)
      const verifyData = await callMsg91("verifyOtp", { reqId, otp: targetOtp }, controller.signal, 15000);
      
      if (controller.signal.aborted) return;

      if (verifyData.type !== "success") {
        let errorMsg = verifyData.message ?? "Invalid or expired OTP";
        const lower = (verifyData.message ?? "").toLowerCase();
        if (lower.includes("already verif") || lower.includes("already used") || lower.includes("expire")) {
          errorMsg = "OTP has expired. Please request a new code.";
        } else if (lower.includes("invalid") || lower.includes("incorrect") || lower.includes("mismatch") || lower.includes("wrong")) {
          errorMsg = "Incorrect OTP. Please check and try again.";
        }
        setVerifyError(errorMsg);
        toast.error(errorMsg, { id: "otp-verify-fail" });
        return;
      }
      const accessToken = (verifyData.message ?? "") as string;
      if (!accessToken) {
        const missingTokenMsg = "Verification token missing. Please request a new OTP.";
        setVerifyError(missingTokenMsg);
        toast.error(missingTokenMsg, { id: "otp-no-token" });
        return;
      }

      if (mode === "sign-in") {
        const res = await api.post(
          "/auth/mobile/login",
          { phone: phone.trim(), accessToken },
          { signal: controller.signal, timeout: 15000 }
        );
        toast.success(res.data.message ?? "Welcome back!", { id: "login-ok" });
        await checkAuthStatus();
        handleClose();
      } else {
        const res = await api.post(
          "/auth/mobile/register",
          {
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim(),
            accessToken,
          },
          { signal: controller.signal, timeout: 15000 }
        );
        toast.success(res.data.message ?? "Account created! Welcome.", { id: "register-ok" });
        await checkAuthStatus();
        handleClose();
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const e = err as {
        response?: { data?: { message?: string; code?: string } };
        code?: string;
        message?: string;
      };
      const msg = e?.response?.data?.message;
      const code = e?.response?.data?.code;

      if (code === "NO_ACCOUNT") {
        const savedPhone = phone;
        toast.error("No account found. Please create an account.", { id: "no-account", duration: 4000 });
        reset();
        setMode("register");
        setPhone(savedPhone);
      } else if (code === "DUPLICATE") {
        toast.error("Account already exists. Please sign in instead.", { id: "duplicate", duration: 4000 });
        const savedPhone = phone;
        reset();
        setMode("sign-in");
        setPhone(savedPhone);
      } else if (e?.code === "ECONNABORTED" || e?.message?.includes("timeout")) {
        const timeoutMsg = "Verification timed out. Please check your connection and try again.";
        setVerifyError(timeoutMsg);
        toast.error(timeoutMsg, { id: "otp-verify-timeout" });
      } else {
        let fallbackMsg = msg ?? "Something went wrong. Please try again.";
        const lower = fallbackMsg.toLowerCase();
        if (lower.includes("already verif") || lower.includes("already used") || lower.includes("expire")) {
          fallbackMsg = "OTP has expired. Please request a new code.";
        }
        setVerifyError(fallbackMsg);
        toast.error(fallbackMsg, { id: "otp-verify-fail" });
      }
    } finally {
      clearTakingLongTimer();
      setTakingLong(false);
      setLoading(false);
      isVerifyingRef.current = false;
      abortControllerRef.current = null;
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (timer > 0) return;
    try {
      setLoading(true);
      setVerifyError("");
      const data = await callMsg91("retryOtp", { reqId }, undefined, 10000);
      if (data.type !== "success") {
        toast.error(data.message ?? "Failed to resend OTP", { id: "resend-fail" });
        return;
      }
      if (data.message) setReqId(data.message as string);
      toast.success("OTP resent!", { id: "otp-resent" });
      setOtp("");
      setTimer(120); // 2 minutes resend cooldown
    } catch {
      toast.error("Failed to resend OTP.", { id: "resend-fail" });
    } finally {
      setLoading(false);
    }
  };

  // ── Handle OTP input change with auto-submit ──────────────────────────────
  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setOtp(digits);
    if (verifyError) setVerifyError("");

    // Auto-verify when all 4 digits are completed
    if (digits.length === 4 && !loading && !isVerifyingRef.current) {
      setTimeout(() => {
        handleVerifyOtp(digits);
      }, 50);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const title = step === "otp"
    ? "Verify OTP"
    : mode === "sign-in" ? "Sign In" : "Create Account";

  const subtitle = step === "otp"
    ? `Enter the 4-digit code sent to +91 ${phone}`
    : mode === "sign-in"
      ? "Enter your registered mobile number to proceed"
      : "Sign up with your details to start shopping";

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-[100]">
      <DialogBackdrop className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in" />

      <div className="fixed inset-0 flex items-center justify-center p-2.5 sm:p-5">
        <DialogPanel className="w-full max-w-[430px] sm:max-w-[720px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative animate-in zoom-in-95 duration-200 text-slate-800 p-0">
          {/* Global Close Button (top-right of entire modal on all screen sizes) */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer z-30"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" strokeWidth={2} />
          </button>

          <div className="flex flex-col sm:grid sm:grid-cols-[260px_1fr] sm:min-h-[380px]">
            {/* ── Left Side: Brand Promo Banner (Visible on desktop/tablet >= sm) ── */}
            <div className="hidden sm:flex bg-gradient-to-b from-slate-100/90 via-slate-50/70 to-white flex-col items-center justify-center p-7 sm:p-8 text-center border-r border-slate-100 relative">
              <div className="flex flex-col items-center my-auto">
                <div className="w-22 h-22 sm:w-28 sm:h-28 rounded-full bg-white shadow-md border-2 border-amber-200/60 p-3 flex items-center justify-center">
                  <img src={panakkalLogo} alt="Panakkal Ayurveda" className="w-full h-full object-contain" />
                </div>
                <h3 className="font-serif font-bold text-base sm:text-xl text-slate-800 tracking-tight mt-3.5">
                  Panakkal Ayurveda
                </h3>
              </div>
            </div>

            {/* ── Right Side / Mobile Single Card: Form & Inputs ──────────────── */}
            <div className="p-6 sm:p-8 flex flex-col justify-between relative bg-white">
              {/* Mobile-only compact brand header */}
              <div className="sm:hidden flex items-center gap-3 mb-5 pr-8">
                <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-amber-200/60 p-1.5 flex items-center justify-center shrink-0">
                  <img src={panakkalLogo} alt="Panakkal Ayurveda" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-slate-900 tracking-tight leading-tight">
                    Panakkal Ayurveda
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Fast & Secure Login</p>
                </div>
              </div>

              {/* ── Admin Blocked Screen ─────────────────────────────────── */}
              {adminBlocked ? (
                <div className="flex flex-col items-center text-center gap-3 py-2 my-auto">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-inner">
                    <ShieldExclamationIcon className="w-6 h-6 text-rose-500" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-slate-900 tracking-tight">Access Restricted</h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      This mobile number belongs to an administrative profile. Please log in through the Admin Portal.
                    </p>
                  </div>
                  <button
                    onClick={() => { setAdminBlocked(false); setPhone(""); }}
                    className="w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    <ArrowLeftIcon className="w-4 h-4" strokeWidth={2.2} />
                    Try different number
                  </button>
                </div>
              ) : step === "form" ? (
                /* ── Form Step ─────────────────────────────────────────── */
                <div className="flex flex-col justify-between h-full pt-1">
                  <div>
                    {/* Mode Toggle (Tabs) */}
                    <div className="flex items-center gap-5 mb-5 pb-1">
                      <button
                        type="button"
                        onClick={() => switchMode("sign-in")}
                        className={`text-xs sm:text-sm font-bold uppercase tracking-wider pb-1 transition-all cursor-pointer relative ${
                          mode === "sign-in"
                            ? "text-[#0B6B6B]"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Sign In
                        {mode === "sign-in" && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0B6B6B] rounded-full" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode("register")}
                        className={`text-xs sm:text-sm font-bold uppercase tracking-wider pb-1 transition-all cursor-pointer relative ${
                          mode === "register"
                            ? "text-[#0B6B6B]"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Create Account
                        {mode === "register" && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0B6B6B] rounded-full" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {mode === "register" && (
                        <>
                          <div>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  emailRef.current?.focus();
                                }
                              }}
                              placeholder="Enter Full Name *"
                              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 transition shadow-2xs"
                              autoFocus
                            />
                          </div>
                          <div>
                            <input
                              ref={emailRef}
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value.toLowerCase())}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  phoneRef.current?.focus();
                                }
                              }}
                              placeholder="Enter Email Address (optional)"
                              className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 transition shadow-2xs"
                            />
                          </div>
                        </>
                      )}

                      {/* Phone Input: +91 box + Enter Mobile Number */}
                      <div>
                        <div className="flex items-stretch gap-2.5">
                          <div className="flex items-center justify-center px-3.5 py-3 bg-white border border-slate-300 rounded-xl text-sm sm:text-base font-bold text-slate-900 shrink-0 select-none shadow-2xs">
                            +91
                          </div>
                          <div className="relative flex-1">
                            <input
                              ref={phoneRef}
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              value={phone}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              onBlur={() => phone.length > 0 && validatePhone(phone)}
                              placeholder="Enter Mobile Number"
                              className={`w-full px-4 py-3 bg-white border rounded-xl text-sm sm:text-base font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 tracking-wide focus:outline-none transition shadow-2xs ${
                                phoneError
                                  ? "border-rose-400 focus:ring-2 focus:ring-rose-500/10"
                                  : "border-slate-300 focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15"
                              }`}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSendOtp();
                                }
                              }}
                              autoFocus={mode === "sign-in"}
                            />
                            {phone.length === 10 && (
                              <CheckCircleIcon className="w-5 h-5 text-[#0B6B6B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            )}
                          </div>
                        </div>

                        {phoneError && (
                          <p className="text-xs text-rose-500 font-medium flex items-center gap-1 mt-1.5 pl-1">
                            <ShieldExclamationIcon className="w-4 h-4 shrink-0 text-rose-500" strokeWidth={2} />
                            {phoneError}
                          </p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="w-full py-3 sm:py-3.5 bg-[#0B6B6B] hover:bg-[#084E4E] active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl shadow-xs transition-all duration-150 disabled:opacity-50 cursor-pointer flex items-center justify-center mt-3"
                      >
                        {loading ? <ClipLoader color="white" size={20} /> : "Submit"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── OTP Step ───────────────────────────────────────────── */
                <div className="flex flex-col justify-between h-full pt-1">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base sm:text-lg">Enter Verification Code</h4>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Enter 4-digit code sent to <span className="font-bold text-slate-900">+91 {phone}</span>
                      </p>
                    </div>

                    <OtpInput
                      value={otp}
                      onChange={handleOtpChange}
                      numInputs={4}
                      shouldAutoFocus
                      renderInput={(props) => (
                        <input
                          {...props}
                          disabled={loading}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          className={`${OTP_CLASS} ${loading ? "opacity-60 bg-slate-50 cursor-not-allowed" : ""}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && otp.length === 4 && !loading) {
                              e.preventDefault();
                              handleVerifyOtp(otp);
                            }
                            if (props.onKeyDown) props.onKeyDown(e);
                          }}
                        />
                      )}
                      containerStyle={{ width: "100%", display: "flex", justifyContent: "center", gap: "12px" }}
                    />

                    {verifyError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs sm:text-sm text-rose-700 font-medium">
                        {verifyError}
                      </div>
                    )}

                    {loading && takingLong && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                        <span className="truncate">Taking longer than usual...</span>
                        <button
                          type="button"
                          onClick={handleCancelVerification}
                          className="font-bold underline text-[11px] cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={loading || otp.length !== 4}
                      className="w-full py-3 sm:py-3.5 bg-[#0B6B6B] hover:bg-[#084E4E] text-white font-bold text-sm sm:text-base rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <ClipLoader color="white" size={18} />
                          <span>Verifying...</span>
                        </div>
                      ) : (
                        "Verify & Submit"
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={timer > 0 || loading}
                        className="font-semibold text-[#0B6B6B] hover:text-[#084E4E] hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {timer > 0 ? `Resend in ${formatTimer(timer)}` : "Resend OTP"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleCancelVerification();
                          setStep("form");
                          setOtp("");
                          setVerifyError("");
                        }}
                        disabled={loading}
                        className="text-slate-400 hover:text-slate-700 font-medium cursor-pointer"
                      >
                        Change number
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
