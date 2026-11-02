import React from "react";
import panakkalLogo from "../assets/Panakkallogo.png";

interface LoaderProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({
  message = "Please wait",
  subMessage,
  fullScreen = true,
  size = "md",
  className = "",
}) => {
  const isLg = size === "lg";
  const isSm = size === "sm";

  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF8F2] text-[#172B2A] select-none transition-opacity duration-300"
    : `min-h-screen w-full flex-1 flex flex-col items-center justify-center bg-[#FAF8F2] text-[#172B2A] py-12 select-none ${className}`;

  return (
    <div className={containerClasses}>
      <div className="relative flex flex-col items-center">
        {/* Ambient Glow Aura */}
        <div className="absolute -inset-8 rounded-full bg-gradient-to-tr from-[#0B6B6B]/10 via-[#D4A373]/10 to-transparent blur-xl pointer-events-none" />

        {/* Outer Circular Ring & Spinner */}
        <div
          className={`relative flex items-center justify-center mb-5 ${
            isSm ? "w-16 h-16" : isLg ? "w-28 h-28" : "w-24 h-24"
          }`}
        >
          {/* Subtle pulsating outer ring */}
          <div className="absolute inset-0 rounded-full border border-[#0B6B6B]/25 animate-ping opacity-25" />
          
          {/* Static golden/cream guide track */}
          <div className="absolute inset-1 rounded-full border-2 border-[#E4DCCE]/80" />

          {/* Smooth spinning teal gradient ring */}
          <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-[#0B6B6B] border-r-[#0B6B6B]/70 border-b-transparent border-l-transparent animate-spin" />

          {/* Central Logo Container */}
          <div
            className={`relative rounded-full bg-white shadow-xs border border-[#E4DCCE] flex items-center justify-center overflow-hidden ${
              isSm ? "w-10 h-10 p-1.5" : isLg ? "w-16 h-16 p-2.5" : "w-14 h-14 p-2"
            }`}
          >
            <img
              src={panakkalLogo}
              alt="Panakkal Ayurveda"
              className="w-full h-full object-contain animate-pulse"
            />
          </div>
        </div>

        {/* Brand Name */}
        <h2 className="font-serif font-bold text-xl sm:text-2xl text-[#172B2A] tracking-tight">
          Panakkal Ayurveda
        </h2>

        {/* Status Message */}
        <p className="text-xs sm:text-sm font-semibold tracking-wider text-[#0B6B6B] uppercase mt-1.5 flex items-center gap-1.5">
          <span>{message}</span>
          <span className="inline-flex gap-1 ml-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] animate-bounce" />
          </span>
        </p>

        {subMessage && (
          <p className="text-[11px] text-[#6B7280] font-sans mt-1 text-center max-w-xs">
            {subMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default Loader;


