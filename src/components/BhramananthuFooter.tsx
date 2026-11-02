import React from "react";
import { Link, useNavigate } from "react-router-dom";
import panakkalLogo from "../assets/Panakkallogo.png";

interface BhramananthuFooterProps {
  onShopClick?: (anchorId: string) => void;
}

const BhramananthuFooter: React.FC<BhramananthuFooterProps> = ({ onShopClick }) => {
  const navigate = useNavigate();

  const handleShopNavigation = (anchorId: string) => {
    if (onShopClick) {
      onShopClick(anchorId);
      return;
    }

    // If on another page, navigate to home with hash
    if (window.location.pathname !== "/") {
      navigate(`/#${anchorId}`);
      setTimeout(() => {
        const el =
          document.getElementById(anchorId) ||
          document.getElementById("product-image-section") ||
          document.getElementById("product-hero");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          const scrollContainer =
            document.querySelector(".overflow-y-auto") ||
            document.documentElement ||
            document.body;
          scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 150);
    } else {
      const el =
        document.getElementById(anchorId) ||
        document.getElementById("product-image-section") ||
        document.getElementById("product-hero");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const scrollContainer =
          document.querySelector(".overflow-y-auto") ||
          document.documentElement ||
          document.body;
        scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="bg-[#0E201E] text-white pt-16 pb-24 md:pb-12 border-t border-[#1C3330]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#233B38]">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={panakkalLogo}
                alt="Panakkal Ayurveda"
                className="h-10 w-auto object-contain brightness-0 invert"
              />
              <span className="font-serif font-bold text-2xl tracking-tight text-white">
                Panakkal Ayurveda
              </span>
            </div>
            <p className="text-sm text-[#A2B8B4] leading-relaxed max-w-md">
              Manufactured &amp; Marketed by Panakkal Ayurveda Pharmacy, Thrissur.
            </p>
            <p className="text-sm text-[#A2B8B4] leading-relaxed max-w-md">
              Vilanganur, Peechi P.O, Thrissur – 680653, Kerala, India
            </p>
            <a
              href="mailto:panakkalayurvedapharmacy@gmail.com"
              className="inline-block text-sm text-[#4DB6AC] hover:underline"
            >
              panakkalayurvedapharmacy@gmail.com
            </a>
          </div>

          {/* Col 2: Shop Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-bold text-base text-white tracking-wide">Shop</h4>
            <ul className="space-y-2 text-sm text-[#A2B8B4]">
              <li>
                <button
                  type="button"
                  onClick={() => handleShopNavigation("product-image-section")}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Buy Bhramananthu Oil
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleShopNavigation("how-to-use")}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Directions to use
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleShopNavigation("ingredients")}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Ingredients
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleShopNavigation("reviews")}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Reviews
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleShopNavigation("faqs")}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Help & Policies */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-bold text-base text-white tracking-wide">Help</h4>
            <ul className="space-y-2 text-sm text-[#A2B8B4]">
              <li>
                <button
                  type="button"
                  onClick={() => handleShopNavigation("contact")}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Contact us
                </button>
              </li>
              <li>
                <Link to="/shipping-policy" className="hover:text-white transition-colors">
                  Shipping and returns
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition-colors">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/917593875934?text=Hello%20Panakkal%20Ayurveda%20Pharmacy,%20I%20have%20an%20inquiry%20about%20Bhramananthu"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/share/1F3e3sUt4x/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/panakkal_ayurveda_pharmacy?utm_source=ig_web_button_share_sheet&amp;stkn=ZDNlZDc0MzIxNw=="
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Payment Badges & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="text-[#75908C] mr-2">We accept:</span>
            {["UPI", "Visa", "Mastercard", "RuPay", "Net banking", "Cash on delivery"].map((badge) => (
              <span
                key={badge}
                className="bg-[#18312E] text-[#D0E2DF] px-2.5 py-1 rounded text-xs font-semibold border border-[#274541]"
              >
                {badge}
              </span>
            ))}
          </div>

          <p className="text-xs text-[#75908C] text-center md:text-right leading-relaxed">
            Copyright © 2026 – All rights reserved with Panakkal Ayurveda Pharmacy. For external use only, as directed by an Ayurvedic practitioner.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default BhramananthuFooter;
