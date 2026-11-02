// src/login/Login.tsx
// Redesigned to match the Panakkal Ayurveda Pharmacy brand aesthetic:
// - Warm heritage cream palette (#FAF8F2 / #F6EFE5)
// - Deep forest teal (#0B6B6B) & warm gold accents (#E5A83B)
// - Editorial serif typography & authentic Ayurvedic pharmacy presentation
// - Cohesive back-to-store navigation button

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import { motion, AnimatePresence } from "framer-motion";
import OtpInput from "react-otp-input";

import panakkalLogo from "../assets/Panakkallogo.png";
import {
  useLoginFlow,
  type LoginStep,
  type LoginFlowState,
} from "./useLoginFlow";
import PageSeo from "../components/seo/PageSeo";

// ── Shared UI Atoms ────────────────────────────────────────────────────────────

function ActionButton({
  label,
  loading,
  onClick,
  type = "submit",
  disabled,
  icon,
}: {
  label: string;
  loading: boolean;
  onClick?: () => void;
  type?: "submit" | "button";
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={onClick}
      className="w-full h-12 mt-2 bg-[#0B6B6B] hover:bg-[#084E4E] active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      {loading ? (
        <ClipLoader color="#ffffff" size={18} />
      ) : (
        <>
          <span>{label}</span>
          {icon ?? <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
        </>
      )}
    </button>
  );
}

function TextInput({
  id,
  type = "text",
  name,
  autoComplete,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  icon,
}: {
  id?: string;
  type?: string;
  name: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7E8E8B] pointer-events-none">
          {icon}
        </span>
      )}
      <input
        id={id}
        type={type}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`border border-[#E6DFD5] bg-[#FAF8F2] py-3 text-sm w-full ${
          icon ? "pl-11 pr-4" : "px-4"
        } text-[#172B2A] placeholder:text-[#8C9896] rounded-xl focus:bg-white focus:border-[#0B6B6B] focus:ring-4 focus:ring-[#0B6B6B]/15 focus:outline-none transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs`}
      />
    </div>
  );
}

function PasswordInput({
  id,
  name,
  autoComplete,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id?: string;
  name: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7E8E8B] pointer-events-none">
        <Lock className="w-4 h-4" />
      </span>
      <input
        id={id}
        type={visible ? "text" : "password"}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        disabled={disabled}
        className="border border-[#E6DFD5] bg-[#FAF8F2] pl-11 pr-11 py-3 text-sm w-full text-[#172B2A] placeholder:text-[#8C9896] rounded-xl focus:bg-white focus:border-[#0B6B6B] focus:ring-4 focus:ring-[#0B6B6B]/15 focus:outline-none transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((p) => !p)}
        tabIndex={-1}
        disabled={disabled}
        className="absolute inset-y-0 right-3 flex items-center text-[#7E8E8B] hover:text-[#0B6B6B] transition-colors disabled:opacity-50 cursor-pointer"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function OtpWidget({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <OtpInput
        value={value}
        onChange={onChange}
        numInputs={6}
        shouldAutoFocus
        renderInput={(props) => (
          <input
            {...props}
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={disabled}
            className="!w-10 sm:!w-12 !h-12 sm:!h-13 border-2 border-[#E6DFD5] text-center text-lg sm:text-xl font-bold rounded-xl text-[#172B2A] bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#0B6B6B] focus:ring-4 focus:ring-[#0B6B6B]/15 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
          />
        )}
        containerStyle={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: "8px",
        }}
      />
    </div>
  );
}

function ResendControl({
  timer,
  formatTimer,
  onClick,
  loading,
}: {
  timer: number;
  formatTimer: (s: number) => string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <p className="text-xs sm:text-sm text-[#5C6E6B] text-center">
      Didn't receive the code?{" "}
      <button
        type="button"
        onClick={onClick}
        disabled={timer > 0 || loading}
        className="ml-1 font-bold text-[#0B6B6B] hover:underline disabled:opacity-50 disabled:no-underline transition-opacity cursor-pointer"
      >
        {timer > 0 ? `Resend in ${formatTimer(timer)}` : "Resend OTP"}
      </button>
    </p>
  );
}

function BackButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5C6E6B] hover:text-[#0B6B6B] self-center mt-1 transition-colors disabled:opacity-50 cursor-pointer"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ── Step Views ────────────────────────────────────────────────────────────────

function CredentialsForm({ flow }: { flow: LoginFlowState }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        flow.handleLoginSubmit();
      }}
      className="flex flex-col gap-4 mt-6"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="login-email"
          className="text-[11px] font-bold uppercase tracking-wider text-[#34504D]"
        >
          Email address
        </label>
        <TextInput
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          value={flow.email}
          onChange={(v) => flow.setEmail(v.toLowerCase())}
          placeholder="name@example.com"
          required
          disabled={flow.loading}
          icon={<Mail className="w-4 h-4" />}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="login-password"
            className="text-[11px] font-bold uppercase tracking-wider text-[#34504D]"
          >
            Password
          </label>
          <button
            type="button"
            className="text-xs font-bold text-[#0B6B6B] hover:text-[#084E4E] hover:underline disabled:opacity-50 cursor-pointer"
            onClick={() => flow.setStep("forgot-email")}
            disabled={flow.loading}
          >
            Forgot password?
          </button>
        </div>
        <PasswordInput
          id="login-password"
          name="password"
          autoComplete="current-password"
          value={flow.password}
          onChange={flow.setPassword}
          placeholder="Enter your password"
          disabled={flow.loading}
        />
      </div>

      <ActionButton label="Sign In" loading={flow.loading} />
    </form>
  );
}

function LoginOtpPanel({ flow }: { flow: LoginFlowState }) {
  const handleOtpChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    flow.setOtp(digits);
    if (digits.length === 6 && !flow.loading) {
      setTimeout(() => flow.handleVerifyOtp(digits), 50);
    }
  };

  return (
    <div
      className="flex flex-col w-full gap-5 mt-6"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !flow.loading && flow.otp.length === 6) flow.handleVerifyOtp();
      }}
    >
      <OtpWidget value={flow.otp} onChange={handleOtpChange} disabled={flow.loading} />
      <div className="flex flex-col gap-3">
        <ActionButton
          type="button"
          label="Verify & Sign In"
          loading={flow.loading}
          onClick={() => flow.handleVerifyOtp()}
        />
        <ResendControl
          timer={flow.timer}
          formatTimer={flow.formatTimer}
          onClick={flow.handleResendOtp}
          loading={flow.loading}
        />
        <BackButton
          label="Back to sign in"
          disabled={flow.loading}
          onClick={() => {
            flow.setStep("credentials");
            flow.setOtp("");
          }}
        />
      </div>
    </div>
  );
}

function ForgotEmailPanel({ flow }: { flow: LoginFlowState }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        flow.handleForgotSubmit();
      }}
      className="flex flex-col gap-4 mt-6"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="reset-email"
          className="text-[11px] font-bold uppercase tracking-wider text-[#34504D]"
        >
          Registered email address
        </label>
        <TextInput
          id="reset-email"
          type="email"
          name="email"
          autoComplete="email"
          value={flow.resetEmail}
          onChange={(v) => flow.setResetEmail(v.toLowerCase())}
          placeholder="name@example.com"
          required
          disabled={flow.loading}
          icon={<Mail className="w-4 h-4" />}
        />
      </div>
      <ActionButton label="Send Reset OTP" loading={flow.loading} />
      <BackButton
        label="Back to sign in"
        disabled={flow.loading}
        onClick={() => flow.setStep("credentials")}
      />
    </form>
  );
}

function ForgotOtpPanel({ flow }: { flow: LoginFlowState }) {
  const handleOtpChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    flow.setOtp(digits);
    if (digits.length === 6 && !flow.loading) {
      setTimeout(() => flow.handleVerifyResetOtp(digits), 50);
    }
  };

  return (
    <div
      className="flex flex-col w-full gap-5 mt-6"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !flow.loading && flow.otp.length === 6) flow.handleVerifyResetOtp();
      }}
    >
      <OtpWidget value={flow.otp} onChange={handleOtpChange} disabled={flow.loading} />
      <div className="flex flex-col gap-3">
        <ActionButton
          type="button"
          label="Verify OTP"
          loading={flow.loading}
          onClick={() => flow.handleVerifyResetOtp()}
        />
        <ResendControl
          timer={flow.timer}
          formatTimer={flow.formatTimer}
          onClick={flow.handleResendResetOtp}
          loading={flow.loading}
        />
        <BackButton
          label="Back"
          disabled={flow.loading}
          onClick={() => {
            flow.setStep("forgot-email");
            flow.setOtp("");
          }}
        />
      </div>
    </div>
  );
}

function ResetPasswordPanel({ flow }: { flow: LoginFlowState }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        flow.handleResetPassword();
      }}
      className="flex flex-col gap-4 mt-6"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="new-password"
          className="text-[11px] font-bold uppercase tracking-wider text-[#34504D]"
        >
          New password
        </label>
        <PasswordInput
          id="new-password"
          name="new-password"
          autoComplete="new-password"
          value={flow.newPassword}
          onChange={flow.setNewPassword}
          placeholder="Minimum 8 characters"
          disabled={flow.loading}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirm-password"
          className="text-[11px] font-bold uppercase tracking-wider text-[#34504D]"
        >
          Confirm password
        </label>
        <PasswordInput
          id="confirm-password"
          name="confirm-password"
          autoComplete="new-password"
          value={flow.confirmPassword}
          onChange={flow.setConfirmPassword}
          placeholder="Repeat your password"
          disabled={flow.loading}
        />
      </div>
      <ActionButton label="Reset Password" loading={flow.loading} icon={<KeyRound className="w-4 h-4" />} />
    </form>
  );
}

// ── Step Metadata ─────────────────────────────────────────────────────────────

const STEP_TITLE: Record<LoginStep, string> = {
  credentials: "Welcome Back",
  otp: "Verify Your Identity",
  "forgot-email": "Reset Your Password",
  "forgot-otp": "Check Your Inbox",
  "forgot-reset": "Set A New Password",
};

const STEP_ICON: Partial<Record<LoginStep, React.ReactNode>> = {
  otp: <ShieldCheck className="w-6 h-6 text-[#0B6B6B]" />,
  "forgot-otp": <ShieldCheck className="w-6 h-6 text-[#0B6B6B]" />,
};

function StepSubtitle({
  step,
  email,
  resetEmail,
}: {
  step: LoginStep;
  email: string;
  resetEmail: string;
}) {
  const map: Record<LoginStep, React.ReactNode> = {
    credentials: "Sign in to manage your account, orders and pharmacy portal",
    otp: (
      <>
        We sent a 6-digit code to <span className="font-semibold text-[#172B2A]">{email}</span>
      </>
    ),
    "forgot-email": "Enter your email and we'll send a password reset code",
    "forgot-otp": (
      <>
        Enter the code sent to <span className="font-semibold text-[#172B2A]">{resetEmail}</span>
      </>
    ),
    "forgot-reset": "Choose a strong password for your account",
  };
  return <p className="text-xs sm:text-sm text-[#5C6E6B] text-center mt-1.5 leading-relaxed">{map[step]}</p>;
}

// ── Left Ayurvedic Store Panel ────────────────────────────────────────────────

const STORE_DATA = [
  {
    title: "Since 1996",
    desc: "Nearly 30 years making classical Ayurvedic medicines in Thrissur.",
  },
  {
    title: "Tailapaka Vidhi",
    desc: "Prepared by the classical Ayurvedic method of making medicated oils.",
  },
  {
    title: "Vilanganur, Peechi",
    desc: "Thrissur – 680653, Kerala, India.",
  },
  {
    title: "Pharmacy Helpline",
    desc: "+91 487 2699398 · panakkalayurvedapharmacy@gmail.com",
  },
];

function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 shrink-0 relative flex-col justify-between p-10 xl:p-14 overflow-hidden bg-gradient-to-br from-[#0B5858] via-[#094E4E] to-[#053333] text-white">
      {/* Top: Brand Header */}
      <div className="flex items-center gap-3.5 z-10">
        <div className="w-13 h-13 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center shrink-0 border border-white/30">
          <img
            src={panakkalLogo}
            alt="Panakkal Ayurveda Pharmacy"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <span className="font-serif font-bold text-xl text-white tracking-wide block leading-tight">
            Panakkal Ayurveda
          </span>
          <span className="text-[11px] tracking-[0.2em] text-amber-300 font-semibold uppercase block mt-0.5">
            Pharmacy · Established 1996
          </span>
        </div>
      </div>

      {/* Middle: Editorial Value Proposition from About Us */}
      <div className="z-10 max-w-lg my-auto py-8">
        <h2 className="text-3xl sm:text-4xl xl:text-5xl font-serif font-bold text-white leading-[1.18] tracking-tight">
          Panakkal Ayurveda Pharmacy
        </h2>
        <p className="mt-4 text-sm sm:text-base text-[#D7ECE8] leading-relaxed font-body max-w-md">
          Vilanganur, Peechi, Thrissur, Kerala. Established 1996. Making classical Ayurvedic medicines for nearly 30 years according to traditional Tailapaka vidhi.
        </p>
      </div>

      {/* Bottom: 4 Store Highlights from About Us (No icons) */}
      <div className="z-10 grid grid-cols-2 gap-3 w-full max-w-lg">
        {STORE_DATA.map((item) => (
          <div
            key={item.title}
            className="p-3.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs shadow-2xs flex flex-col justify-center"
          >
            <span className="text-xs font-bold text-white tracking-wide">
              {item.title}
            </span>
            <span className="text-[11px] text-[#D7ECE8] leading-relaxed mt-1">
              {item.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root Login Page Component ─────────────────────────────────────────────────

export default function Login() {
  const navigate = useNavigate();
  const flow = useLoginFlow();
  const stepIcon = STEP_ICON[flow.step];

  return (
    <div className="flex min-h-screen bg-[#FAF8F2] text-[#172B2A] font-body overflow-x-hidden">
      <PageSeo title="Sign In | Panakkal Ayurveda Pharmacy" path="/login" noIndex />

      {/* ── Left Decorative Heritage Panel ── */}
      <LeftPanel />

      {/* ── Right Form Panel ── */}
      <main className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative min-w-0">
        {/* Top bar with Cart-Style Back Button */}
        <div className="w-full flex items-center justify-between z-10 mb-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E6DFD5] text-xs font-bold text-[#172B2A] hover:bg-[#F3EFE7] hover:text-[#0B6B6B] transition shadow-2xs cursor-pointer group"
            aria-label="Back to store"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Store</span>
          </button>

          <Link
            to="/"
            className="lg:hidden flex items-center gap-2"
            aria-label="Panakkal Ayurveda Pharmacy Home"
          >
            <img
              src={panakkalLogo}
              alt="Panakkal Ayurveda Pharmacy"
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Center Card */}
        <div className="w-full flex items-center justify-center my-auto py-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={flow.step}
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-10 bg-white shadow-xl shadow-black/5 w-full max-w-[500px] p-8 sm:p-10 rounded-[2rem] border border-[#E6DFD5] overflow-hidden"
            >
              {/* Logo + Brand Name inside Card */}
              <div className="flex flex-col items-center mb-5">
                <div className="w-16 h-16 rounded-2xl bg-white border border-[#E6DFD5] flex items-center justify-center p-2.5 mb-3 shadow-2xs">
                  {stepIcon ? (
                    stepIcon
                  ) : (
                    <img
                      src={panakkalLogo}
                      alt="Panakkal Ayurveda Pharmacy"
                      className="w-12 h-12 object-contain"
                    />
                  )}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#34504D]">
                  Panakkal Ayurveda Pharmacy
                </span>
              </div>

              {/* Step Title & Subtitle */}
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#172B2A] text-center tracking-tight">
                {STEP_TITLE[flow.step]}
              </h1>
              <StepSubtitle
                step={flow.step}
                email={flow.email}
                resetEmail={flow.resetEmail}
              />

              {/* Step Content */}
              {flow.step === "credentials" && <CredentialsForm flow={flow} />}
              {flow.step === "otp" && <LoginOtpPanel flow={flow} />}
              {flow.step === "forgot-email" && <ForgotEmailPanel flow={flow} />}
              {flow.step === "forgot-otp" && <ForgotOtpPanel flow={flow} />}
              {flow.step === "forgot-reset" && <ResetPasswordPanel flow={flow} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="w-full text-center z-10 pt-4">
          <p className="text-xs text-[#7E8E8B]">
            © {new Date().getFullYear()} Panakkal Ayurveda Pharmacy. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
