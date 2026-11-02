import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import CustomerAuthModal from "./CustomerAuthModal";
import panakkalLogo from "../assets/Panakkallogo.png";
import { useUiStore } from "../store/uiStore";

export type TextSizeLevel = "normal" | "large" | "xlarge";

interface NavbarProps {
  user?: { isAuthenticated?: boolean; role?: string | null };
  role?: string | null;
  cartItemCount?: number;
  handleLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  user: userProp,
  role: roleProp,
  cartItemCount: cartItemCountProp,
  handleLogout: handleLogoutProp,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const { cartItems } = useCart();
  const { user: authContextUser, logout: authContextLogout } = useAuth();

  // Unified auth state (supporting both prop and context)
  const isAuthenticated = userProp?.isAuthenticated ?? authContextUser.isAuthenticated;
  const userRole = userProp?.role ?? authContextUser.role ?? roleProp;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  // Modal & Dropdown state
  const [customerAuthOpen, setCustomerAuthOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { isMobileMenuOpen: mobileMenuOpen, setMobileMenuOpen } = useUiStore();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  // Real-time cart quantity for both guest and logged in users
  const totalCartCount =
    cartItems?.reduce((sum, item) => sum + (item.quantity || 1), 0) ??
    cartItemCountProp ??
    0;

  // Open auth modal from anywhere via global window event
  useEffect(() => {
    const handler = () => setCustomerAuthOpen(true);
    window.addEventListener("openCustomerAuth", handler);
    return () => window.removeEventListener("openCustomerAuth", handler);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Text size state: normal (A), large (A+), xlarge (A++)
  // Defaults to "xlarge" (A++) when a customer enters the page
  const [textSize, setTextSize] = useState<TextSizeLevel>(() => {
    try {
      const v2 = localStorage.getItem("bhramananthu_text_size_v2");
      if (v2 === "normal" || v2 === "large" || v2 === "xlarge") return v2;
      const saved = localStorage.getItem("bhramananthu_text_size");
      if (saved === "normal" || saved === "xlarge") return saved;
    } catch {
      // ignore
    }
    return "xlarge";
  });

  const handleTextSizeChange = (level: TextSizeLevel) => {
    setTextSize(level);
    try {
      localStorage.setItem("bhramananthu_text_size_v2", level);
      localStorage.setItem("bhramananthu_text_size", level);
      document.documentElement.setAttribute("data-text-size", level);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-text-size", textSize);
  }, [textSize]);

  // Keep --app-header-h synchronized with real header height
  useEffect(() => {
    if (!headerRef.current) return;
    const updateHeaderHeight = () => {
      if (headerRef.current && !mobileMenuOpen) {
        document.documentElement.style.setProperty(
          "--app-header-h",
          `${headerRef.current.offsetHeight}px`
        );
      }
    };

    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [mobileMenuOpen]);

  // Smooth scroll handler for anchor links
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    anchorId: string
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (location.pathname === "/") {
      const element = document.getElementById(anchorId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      navigate(`/#${anchorId}`);
      setTimeout(() => {
        const element = document.getElementById(anchorId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    }
  };

  const navLinks = [
    { name: "Uses", href: "uses" },
    { name: "About", href: "about" },
    { name: "How to use", href: "how-to-use" },
    { name: "Ingredients", href: "ingredients" },
    { name: "Reviews", href: "reviews" },
    { name: "FAQs", href: "faqs" },
    { name: "Contact", href: "contact" },
  ];

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 w-full ${
          mobileMenuOpen ? "z-50" : "z-40"
        } bg-[#FAF8F2] select-none`}
      >
        {/* ==================== 1. TOP HELPLINE & TEXT-SIZE BAR ==================== */}
        <div className="bg-[#DDEDEA] text-[#172B2A] py-1.5 sm:py-2 px-2.5 sm:px-6 lg:px-6 xl:px-8 2xl:px-12 border-b border-[#D0E5E0]">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between min-h-[32px] sm:min-h-[38px] gap-1.5 sm:gap-2">
            {/* Left: Call to order numbers */}
            <div className="flex items-center text-xs sm:text-[14px] lg:text-[15px] leading-none min-w-0">
              <span className="text-[#2C4643] font-normal mr-1.5 sm:mr-3 whitespace-nowrap">
                <span className="hidden sm:inline">Call to order:</span>
                <span className="sm:hidden font-medium text-[11px] xs:text-xs">Call:</span>
              </span>
              <div className="flex items-center gap-2 sm:gap-4 md:gap-5 whitespace-nowrap">
                <a
                  href="tel:+917593875934"
                  className="font-extrabold text-[#172B2A] hover:text-[#0B6B6B] hover:underline transition-colors tracking-tight whitespace-nowrap text-xs sm:text-sm lg:text-[15px]"
                >
                  +91 75938 75934
                </a>
                <span className="text-[#88A6A0] hidden md:inline">|</span>
                <a
                  href="tel:+919995579398"
                  className="hidden md:inline font-extrabold text-[#172B2A] hover:text-[#0B6B6B] hover:underline transition-colors tracking-tight whitespace-nowrap text-xs sm:text-sm lg:text-[15px]"
                >
                  +91 99955 79398
                </a>
              </div>
            </div>

            {/* Right: Text size buttons: A, A+, A++ */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <span className="text-[#2C4643] text-xs sm:text-[14px] lg:text-[15px] font-normal leading-none select-none hidden sm:inline">
                Text size
              </span>
              <div className="flex items-center gap-1 sm:gap-2" role="group" aria-label="Font size controls">
                {/* Button A */}
                <button
                  type="button"
                  onClick={() => handleTextSizeChange("normal")}
                  title="Standard text size (A)"
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-[7px] sm:rounded-[10px] font-bold text-xs sm:text-[15px] inline-flex items-center justify-center leading-none transition-all cursor-pointer ${
                    textSize === "normal"
                      ? "bg-[#0B6B6B] text-white border-[1.5px] sm:border-[1.8px] border-[#0B6B6B] shadow-xs"
                      : "bg-white border-[1.5px] sm:border-[1.8px] border-[#0B6B6B] text-[#0B6B6B] hover:bg-[#DDEDEA]/70"
                  }`}
                >
                  A
                </button>

                {/* Button A+ */}
                <button
                  type="button"
                  onClick={() => handleTextSizeChange("large")}
                  title="Large text size (A+)"
                  className={`min-w-[32px] sm:min-w-[42px] px-1 sm:px-2.5 h-7 sm:h-9 rounded-[7px] sm:rounded-[10px] font-bold text-xs sm:text-[15px] inline-flex items-center justify-center leading-none transition-all cursor-pointer ${
                    textSize === "large"
                      ? "bg-[#0B6B6B] text-white border-[1.5px] sm:border-[1.8px] border-[#0B6B6B] shadow-xs"
                      : "bg-white border-[1.5px] sm:border-[1.8px] border-[#0B6B6B] text-[#0B6B6B] hover:bg-[#DDEDEA]/70"
                  }`}
                >
                  A+
                </button>

                {/* Button A++ */}
                <button
                  type="button"
                  onClick={() => handleTextSizeChange("xlarge")}
                  title="Default text size (A++)"
                  className={`min-w-[36px] sm:min-w-[50px] px-1 sm:px-2.5 h-7 sm:h-9 rounded-[7px] sm:rounded-[10px] font-bold text-xs sm:text-[15px] inline-flex items-center justify-center leading-none transition-all cursor-pointer ${
                    textSize === "xlarge"
                      ? "bg-[#0B6B6B] text-white border-[1.5px] sm:border-[1.8px] border-[#0B6B6B] shadow-xs"
                      : "bg-white border-[1.5px] sm:border-[1.8px] border-[#0B6B6B] text-[#0B6B6B] hover:bg-[#DDEDEA]/70"
                  }`}
                >
                  A++
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== 2. MAIN LOGO & NAVIGATION HEADER ==================== */}
        <div className="bg-[#FAF8F2] border-b border-[#E6DFD5]">
          <div className="max-w-[1400px] mx-auto px-2.5 sm:px-4 lg:px-4 xl:px-8 2xl:px-12">
            <div className="flex items-center justify-between h-16 sm:h-20 lg:h-20 gap-2 lg:gap-2.5 xl:gap-6 2xl:gap-8">
              {/* Left: Brand Logo & Title */}
              <Link
                to="/"
                className="flex items-center gap-1.5 sm:gap-2 xl:gap-3 group focus:outline-none shrink-0"
                aria-label="Panakkal Ayurveda Pharmacy Home"
              >
                <img
                  src={panakkalLogo}
                  alt="Panakkal Ayurveda Pharmacy"
                  className="h-7.5 xs:h-8.5 sm:h-10 lg:h-10 xl:h-12 w-auto object-contain shrink-0"
                />
                <span className="font-body font-bold text-[9.5px] min-[360px]:text-[11px] xs:text-[12.5px] sm:text-[13px] lg:text-[12.5px] xl:text-[15.5px] 2xl:text-[16px] tracking-tight sm:tracking-[0.03em] xl:tracking-[0.06em] text-[#1E2827] uppercase leading-tight select-none whitespace-nowrap">
                  PANAKKAL AYURVEDA PHARMACY
                </span>
              </Link>

              {/* Right: Navigation Links + Cart Button + Customer Login/Account */}
              <div className="hidden lg:flex items-center gap-2 lg:gap-2.5 xl:gap-4 2xl:gap-6 shrink-0">
                {/* Navigation Anchor Links */}
                <nav className="flex items-center gap-1.5 lg:gap-2 xl:gap-3.5 2xl:gap-5" aria-label="Main Navigation">
                  {navLinks.map((link) => (
                    <a
                      key={link.name}
                      href={`#${link.href}`}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className="font-bold text-[12px] lg:text-[12px] xl:text-[14px] 2xl:text-[15px] text-[#172B2A] hover:text-[#0B6B6B] transition-colors py-1 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {link.name}
                    </a>
                  ))}
                </nav>

                {/* Cart Button: Only shown when logged in */}
                {isAuthenticated && (
                  <Link
                    to="/cart"
                    className="flex items-center gap-1.5 xl:gap-2 bg-white hover:bg-[#F3EFE7] border-[1.5px] sm:border-[1.8px] border-[#172B2A] text-[#172B2A] px-2 lg:px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-[10px] xl:rounded-[14px] transition-colors shadow-xs group shrink-0 whitespace-nowrap"
                    aria-label={`Shopping cart with ${totalCartCount} items`}
                  >
                    {/* Shopping cart wireframe icon */}
                    <svg
                      className="w-4 h-4 xl:w-5 xl:h-5 text-[#172B2A] stroke-[#172B2A] shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="9" cy="20" r="1.3" fill="#172B2A" />
                      <circle cx="18" cy="20" r="1.3" fill="#172B2A" />
                      <path d="M2.5 3.5h3l2.4 11.2a1.8 1.8 0 0 0 1.8 1.4h8.8a1.8 1.8 0 0 0 1.8-1.4l1.5-7.5H6.5" />
                    </svg>

                    {/* Cart Text */}
                    <span className="font-bold text-[12px] lg:text-[12px] xl:text-[14px] text-[#172B2A]">
                      Cart
                    </span>

                    {/* Circular count badge in dark teal #0B6B6B */}
                    <span className="min-w-[17px] h-[17px] xl:w-5 xl:h-5 rounded-full bg-[#0B6B6B] text-white text-[10px] xl:text-[11px] font-bold flex items-center justify-center leading-none px-1 shrink-0">
                      {totalCartCount}
                    </span>
                  </Link>
                )}

                {/* Customer Account / Sign In Icon Button */}
                {!isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => setCustomerAuthOpen(true)}
                    className="flex items-center gap-1.5 xl:gap-2 bg-white hover:bg-[#F3EFE7] border-[1.5px] sm:border-[1.8px] border-[#172B2A] text-[#172B2A] px-2 lg:px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-[10px] xl:rounded-[14px] transition-colors shadow-xs group shrink-0 cursor-pointer font-bold text-[12px] lg:text-[12px] xl:text-[14px] whitespace-nowrap"
                    aria-label="Sign In"
                  >
                    <svg
                      className="w-4 h-4 xl:w-5 xl:h-5 text-[#172B2A] stroke-[#172B2A] shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Sign In</span>
                  </button>
                ) : (
                  <div className="relative shrink-0" ref={userDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className="flex items-center gap-1.5 xl:gap-2 bg-white hover:bg-[#F3EFE7] border-[1.5px] sm:border-[1.8px] border-[#172B2A] text-[#172B2A] px-2 lg:px-2.5 xl:px-3.5 py-1.5 xl:py-2 rounded-[10px] xl:rounded-[14px] transition-colors shadow-xs group shrink-0 cursor-pointer font-bold text-[12px] lg:text-[12px] xl:text-[14px] whitespace-nowrap"
                      aria-label="User Account Menu"
                    >
                      <div className="w-4 h-4 xl:w-5 xl:h-5 rounded-full bg-[#0B6B6B] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        <svg
                          className="w-3 xl:w-3.5 h-3 xl:h-3.5 text-white stroke-white"
                          viewBox="0 0 24 24"
                          fill="none"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <span>{isAdmin ? "Admin" : "Account"}</span>
                      <svg
                        className={`w-3.5 h-3.5 xl:w-4 xl:h-4 text-[#172B2A] transition-transform duration-200 shrink-0 ${
                          isUserDropdownOpen ? "rotate-180" : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* User Dropdown Menu */}
                    {isUserDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-[#FAF8F2] border border-[#E6DFD5] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-2 border-b border-[#E6DFD5] mb-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#34504D]">
                            Signed in as
                          </p>
                          <p className="text-xs font-bold text-[#172B2A] truncate">
                            {isAdmin ? "Administrator" : "Customer Account"}
                          </p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#172B2A] hover:bg-[#DDEDEA] hover:text-[#0B6B6B] rounded-xl transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#0B6B6B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                          My Profile
                        </Link>
                        <Link
                          to="/myorders"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#172B2A] hover:bg-[#DDEDEA] hover:text-[#0B6B6B] rounded-xl transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#0B6B6B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                          My Orders
                        </Link>
                        <Link
                          to="/WishlistPage"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#172B2A] hover:bg-[#DDEDEA] hover:text-[#0B6B6B] rounded-xl transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#0B6B6B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          My Wishlist
                        </Link>
                        <div className="border-t border-[#E6DFD5] my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            if (handleLogoutProp) {
                              handleLogoutProp();
                            } else {
                              authContextLogout();
                            }
                          }}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Controls (Cart Button + User Icon + Hamburger Toggle) */}
              <div className="flex lg:hidden items-center gap-1 sm:gap-2 shrink-0 ml-auto">
                {isAuthenticated && (
                  <Link
                    to="/cart"
                    className="flex items-center gap-1 sm:gap-1.5 bg-white border-[1.5px] sm:border-[1.8px] border-[#172B2A] text-[#172B2A] px-1.5 sm:px-2.5 py-1.5 rounded-[10px] sm:rounded-[12px] shadow-2xs hover:bg-[#F3EFE7] transition-colors shrink-0"
                    aria-label="View Cart"
                  >
                    <svg
                      className="w-4 h-4 text-[#172B2A] stroke-[#172B2A] shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="9" cy="20" r="1.3" fill="#172B2A" />
                      <circle cx="18" cy="20" r="1.3" fill="#172B2A" />
                      <path d="M2.5 3.5h3l2.4 11.2a1.8 1.8 0 0 0 1.8 1.4h8.8a1.8 1.8 0 0 0 1.8-1.4l1.5-7.5H6.5" />
                    </svg>
                    <span className="font-bold text-xs hidden xs:inline">Cart</span>
                    <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-[#0B6B6B] text-white text-[10px] font-bold flex items-center justify-center leading-none shrink-0">
                      {totalCartCount}
                    </span>
                  </Link>
                )}

                {/* Mobile User Icon Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate("/profile");
                    } else {
                      setCustomerAuthOpen(true);
                    }
                  }}
                  className="flex items-center justify-center w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 bg-white border-[1.5px] sm:border-[1.8px] border-[#172B2A] text-[#172B2A] rounded-[10px] sm:rounded-[12px] hover:bg-[#F3EFE7] cursor-pointer transition-colors shrink-0"
                  aria-label={isAuthenticated ? "Account profile" : "Sign in"}
                >
                  <svg
                    className="w-4 h-4 text-[#172B2A] stroke-[#172B2A]"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-1 sm:p-1.5 rounded-lg text-[#172B2A] hover:bg-[#DDEDEA] focus:outline-none cursor-pointer shrink-0"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                >
                  {mobileMenuOpen ? (
                    <XMarkIcon className="w-5.5 h-5.5 sm:w-6 sm:h-6 stroke-[2.5]" />
                  ) : (
                    <Bars3Icon className="w-5.5 h-5.5 sm:w-6 sm:h-6 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== 3. MOBILE MENU ==================== */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#FAF8F2] border-b border-[#E6DFD5] px-5 py-4 space-y-4 shadow-xl min-h-[calc(100dvh-95px)] overflow-y-auto overscroll-contain pb-16 flex flex-col justify-start">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={`#${link.href}`}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="font-bold text-[16px] text-[#172B2A] hover:text-[#0B6B6B] hover:bg-[#DDEDEA]/50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  {link.name}
                </a>
              ))}
            </nav>

            {/* Mobile Auth Controls */}
            <div className="pt-3 border-t border-[#E6DFD5]">
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCustomerAuthOpen(true);
                  }}
                  className="w-full py-2.5 bg-[#0B6B6B] hover:bg-[#084E4E] text-white text-sm font-bold rounded-xl transition-colors text-center shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <span>Sign In / Register</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-bold text-[#172B2A] bg-white border border-[#E6DFD5] rounded-xl hover:bg-[#DDEDEA]/50"
                  >
                    <svg className="w-4 h-4 text-[#0B6B6B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    My Profile
                  </Link>
                  <Link
                    to="/myorders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-bold text-[#172B2A] bg-white border border-[#E6DFD5] rounded-xl hover:bg-[#DDEDEA]/50"
                  >
                    <svg className="w-4 h-4 text-[#0B6B6B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    My Orders
                  </Link>
                  <Link
                    to="/WishlistPage"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-bold text-[#172B2A] bg-white border border-[#E6DFD5] rounded-xl hover:bg-[#DDEDEA]/50"
                  >
                    <svg className="w-4 h-4 text-[#0B6B6B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    My Wishlist
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (handleLogoutProp) handleLogoutProp();
                      else authContextLogout();
                    }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100/70 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Customer Authentication Modal (Phone OTP Login & Registration) */}
      <CustomerAuthModal
        open={customerAuthOpen}
        onClose={() => setCustomerAuthOpen(false)}
      />
    </>
  );
};

export default Navbar;