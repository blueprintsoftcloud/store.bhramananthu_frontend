import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

export interface SurveyItemSnapshot {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
}

export interface CancellationFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod?: string;
  triggerSource?: string;
  orderId?: string;
  items?: SurveyItemSnapshot[];
  totalAmount?: number;
  onSubmitted?: () => void;
}

interface SurveyConfig {
  isEnabled: boolean;
  headerTitle: string;
  urgencyBanner: string;
  question: string;
  options: string[];
  allowCustomNote: boolean;
  customNotePlaceholder: string;
  skipButtonText: string;
  submitButtonText: string;
}

const DEFAULT_SURVEY_CONFIG: SurveyConfig = {
  isEnabled: true,
  headerTitle: "Sorry To See You Go..",
  urgencyBanner: "Products In huge demand might run Out of Stock",
  question: "What stopped you from completing your purchase?",
  options: [
    "Found a better deal elsewhere",
    "Technical issues with the website",
    "I changed my mind",
    "Have issues with coupons",
    "Shipping charge too high",
    "Delivery takes too long",
  ],
  allowCustomNote: true,
  customNotePlaceholder: "Others (please specify)",
  skipButtonText: "Skip and exit",
  submitButtonText: "Submit Feedback",
};

let cachedConfig: SurveyConfig | null = null;
let configPromise: Promise<SurveyConfig> | null = null;

const fetchSurveyConfig = async (): Promise<SurveyConfig> => {
  if (cachedConfig) return cachedConfig;
  if (configPromise) return configPromise;

  configPromise = api
    .get("/purchase-feedback/config")
    .then(({ data }) => {
      if (data && typeof data === "object") {
        const conf: SurveyConfig = {
          isEnabled: data.isEnabled !== false,
          headerTitle: data.headerTitle || DEFAULT_SURVEY_CONFIG.headerTitle,
          urgencyBanner: data.urgencyBanner || DEFAULT_SURVEY_CONFIG.urgencyBanner,
          question: data.question || DEFAULT_SURVEY_CONFIG.question,
          options:
            Array.isArray(data.options) && data.options.length > 0
              ? data.options
              : DEFAULT_SURVEY_CONFIG.options,
          allowCustomNote: data.allowCustomNote !== false,
          customNotePlaceholder:
            data.customNotePlaceholder || DEFAULT_SURVEY_CONFIG.customNotePlaceholder,
          skipButtonText: data.skipButtonText || DEFAULT_SURVEY_CONFIG.skipButtonText,
          submitButtonText:
            data.submitButtonText || DEFAULT_SURVEY_CONFIG.submitButtonText,
        };
        cachedConfig = conf;
        return conf;
      }
      return DEFAULT_SURVEY_CONFIG;
    })
    .catch(() => DEFAULT_SURVEY_CONFIG)
    .finally(() => {
      configPromise = null;
    });

  return configPromise;
};

export default function CancellationFeedbackModal({
  isOpen,
  onClose,
  customerName,
  customerEmail,
  customerPhone,
  paymentMethod = "ONLINE",
  triggerSource = "CHECKOUT_CANCELLED",
  orderId,
  items = [],
  totalAmount = 0,
  onSubmitted,
}: CancellationFeedbackModalProps) {
  useBodyScrollLock(isOpen);

  const [config, setConfig] = useState<SurveyConfig>(cachedConfig || DEFAULT_SURVEY_CONFIG);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Pre-load survey config once so it's instantly available without layout jump
  useEffect(() => {
    fetchSurveyConfig().then((conf) => setConfig(conf));
  }, []);

  // Reset selected state whenever the modal is reopened
  useEffect(() => {
    if (isOpen) {
      setSelectedReasons([]);
      setCustomNote("");
      setSubmitting(false);
    }
  }, [isOpen]);

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const isOthersSelected =
    selectedReasons.some((r) => r.toLowerCase().includes("other")) ||
    config.allowCustomNote;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (selectedReasons.length === 0 && !customNote.trim()) {
      toast.error("Please select a reason or write a quick note.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/purchase-feedback", {
        customerName,
        customerEmail,
        customerPhone,
        paymentMethod,
        triggerSource,
        orderId,
        items,
        totalAmount,
        selectedReasons,
        customNote: customNote.trim(),
      });

      toast.success("Thank you for your feedback!", { icon: "🙏" });
      if (onSubmitted) onSubmitted();
      onClose();
    } catch {
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!config.isEnabled) return null;

  const hasSelections = selectedReasons.length > 0 || customNote.trim().length > 0;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop with clean fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-[#172B2A]/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-[460px] max-h-[92vh] flex flex-col overflow-hidden rounded-[2rem] bg-[#FAF8F2] shadow-2xl border border-[#E6DFD5] text-[#172B2A] ring-1 ring-black/5"
          >
            {/* Header Bar */}
            <div className="px-6 pt-6 pb-2 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-xl font-serif font-bold text-[#172B2A] tracking-tight leading-tight">
                  {config.headerTitle}
                </h3>
                <p className="text-xs text-[#5C6E6B] font-medium mt-0.5">
                  Help us improve your shopping experience
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[#7E8E8B] hover:text-[#172B2A] hover:bg-[#EFE8DB]/80 transition cursor-pointer -mr-1 -mt-1"
                aria-label="Close"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="px-6 pb-6 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D0E5E0] [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin] [scrollbar-color:#D0E5E0_transparent]">
              {/* Urgency Highlight Banner */}
              {config.urgencyBanner && (
                <div className="px-4 py-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs font-semibold shadow-2xs">
                  <span className="leading-snug">
                    {config.urgencyBanner.replace(/^✨\s*/, "")}
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6B] mb-2.5">
                    {config.question}
                  </p>

                  {/* Checklist */}
                  <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D0E5E0] [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin] [scrollbar-color:#D0E5E0_transparent]">
                    {config.options.map((option) => {
                      const isChecked = selectedReasons.includes(option);
                      return (
                        <div
                          key={option}
                          onClick={() => toggleReason(option)}
                          className={`group flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold cursor-pointer transition-all duration-200 select-none ${
                            isChecked
                              ? "bg-[#0B6B6B]/10 border-[#0B6B6B] text-[#0B6B6B] shadow-xs ring-1 ring-[#0B6B6B]/30"
                              : "bg-white hover:bg-[#FAF8F2] hover:border-[#0B6B6B]/40 border-[#E6DFD5] text-[#172B2A]"
                          }`}
                        >
                          <span className="leading-snug pr-3">{option}</span>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                              isChecked
                                ? "bg-[#0B6B6B] border-[#0B6B6B] text-white shadow-xs scale-105"
                                : "border-[#C5CFCB] bg-white group-hover:border-[#0B6B6B]"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Note / Others Input */}
                {isOthersSelected && (
                  <div className="pt-1">
                    <textarea
                      rows={2}
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder={config.customNotePlaceholder}
                      className="w-full rounded-2xl border border-[#E6DFD5] bg-white px-4 py-3 text-xs text-[#172B2A] placeholder:text-[#8C9896] focus:border-[#0B6B6B] focus:ring-4 focus:ring-[#0B6B6B]/15 focus:outline-none transition resize-none shadow-2xs"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={submitting || !hasSelections}
                    className="w-full rounded-2xl bg-[#0B6B6B] hover:bg-[#084E4E] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      config.submitButtonText
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-2xl border border-[#E6DFD5] bg-white hover:bg-[#FAF8F2] text-[#4A5554] hover:text-[#172B2A] py-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
                  >
                    {config.skipButtonText}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
