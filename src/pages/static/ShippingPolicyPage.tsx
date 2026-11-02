import React from "react";
import { Link } from "react-router-dom";
import {
  Truck,
  Clock,
  RotateCcw,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  AlertCircle,
  PackageCheck,
  Banknote,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import PageSeo from "../../components/seo/PageSeo";
import BhramananthuFooter from "../../components/BhramananthuFooter";

export default function ShippingPolicyPage() {
  return (
    <div className="bg-[#FAF8F2] min-h-screen font-sans flex flex-col text-[#172B2A] selection:bg-[#0B6B6B]/20 selection:text-[#0B6B6B]">
      <PageSeo
        title="Shipping & Returns Policy | Bhramananthu Oil"
        description="Official Shipping and Returns Policy for Bhramananthu Oil, operated by Panakkal Ayurveda Pharmacy. Free delivery across India, fast dispatch, COD available, and prompt replacements."
        path="/shipping-policy"
      />

      {/* Main Content Container */}
      <main className="w-full flex-1 pt-[calc(var(--app-header-h,120px)+32px)] sm:pt-[calc(var(--app-header-h,120px)+40px)] pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-10">

          {/* Top Breadcrumb & Navigation */}
          <div className="flex items-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B6B6B] hover:text-[#085555] transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-[#E8F3F1] group-hover:bg-[#D5EBE7] flex items-center justify-center transition-colors">
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              </div>
              <span>Back to Store</span>
            </Link>
          </div>

          {/* Hero Header Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#172B2A] to-[#0E201E] text-white p-8 sm:p-12 shadow-lg border border-[#274541]">
            {/* Subtle background ambient glow */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#0B6B6B]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#B8860B]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Shipping and Returns Policy
              </h1>

              <p className="text-[#A2B8B4] text-sm sm:text-base leading-relaxed max-w-2xl pt-1">
                This policy applies to orders placed on{" "}
                <span className="text-white font-medium">store.bhramananthu.com</span>, operated by{" "}
                <span className="text-white font-medium">Panakkal Ayurveda Pharmacy</span>, Vilanganur, Peechi P.O, Thrissur – 680653, Kerala, India.
              </p>
            </div>
          </div>

          {/* Quick Key Takeaways Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#E6DFD5] shadow-xs flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] flex items-center justify-center shrink-0 text-[#0B6B6B]">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#172B2A]">Free Delivery</h4>
                <p className="text-xs text-[#5A6E6A] mt-0.5 leading-snug">On all orders pan-India with zero shipping fee.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E6DFD5] shadow-xs flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] flex items-center justify-center shrink-0 text-[#0B6B6B]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#172B2A]">1–2 Days Dispatch</h4>
                <p className="text-xs text-[#5A6E6A] mt-0.5 leading-snug">Packed swiftly and shipped from Thrissur.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E6DFD5] shadow-xs flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FFF6E5] flex items-center justify-center shrink-0 text-[#B8860B]">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#172B2A]">Cash on Delivery</h4>
                <p className="text-xs text-[#5A6E6A] mt-0.5 leading-snug">Available across India with cash payment.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#E6DFD5] shadow-xs flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] flex items-center justify-center shrink-0 text-[#0B6B6B]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#172B2A]">Safe Replacement</h4>
                <p className="text-xs text-[#5A6E6A] mt-0.5 leading-snug">Free replacement or refund for damaged parcels.</p>
              </div>
            </div>
          </div>

          {/* Section 1: Where We Deliver & Delivery Charges */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Delivery Information</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Where We Deliver &amp; Charges</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#FAF8F2] rounded-2xl p-5 border border-[#E6DFD5]/80 space-y-2">
                <div className="flex items-center gap-2 text-[#0B6B6B]">
                  <MapPin className="w-4 h-4" />
                  <h3 className="font-bold text-base text-[#172B2A]">Where we deliver</h3>
                </div>
                <p className="text-[#3A4E4B] text-sm leading-relaxed">
                  We deliver across India to all serviceable postal pin codes.
                </p>
              </div>

              <div className="bg-[#E8F3F1]/50 rounded-2xl p-5 border border-[#C5E3DF] space-y-2">
                <div className="flex items-center gap-2 text-[#0B6B6B]">
                  <CheckCircle2 className="w-4 h-4" />
                  <h3 className="font-bold text-base text-[#172B2A]">Delivery charges</h3>
                </div>
                <p className="text-[#172B2A] font-semibold text-sm leading-relaxed">
                  Free delivery on all orders from our website.
                </p>
                <p className="text-xs text-[#5A6E6A]">No hidden handling fees or minimum cart constraints.</p>
              </div>
            </div>
          </section>

          {/* Section 2: Dispatch and Delivery Time */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Timeline</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Dispatch and Delivery Time</h2>
              </div>
            </div>

            <div className="space-y-4">
              <ul className="space-y-3.5 text-sm sm:text-base text-[#3A4E4B]">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                  <span>
                    Orders are packed and dispatched within <strong className="text-[#172B2A]">1–2 working days</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                  <span>
                    Delivery usually takes <strong className="text-[#172B2A]">3–5 working days</strong> in Kerala and <strong className="text-[#172B2A]">4–10 working days</strong> to other states.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                  <span>
                    Remote areas may take a little longer.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#B8860B] mt-2 shrink-0" />
                  <span>
                    We do not dispatch on Sundays and public holidays.
                  </span>
                </li>
              </ul>

              {/* Visual Timeline Diagram */}
              <div className="pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-4 rounded-xl bg-[#FAF8F2] border border-[#E6DFD5]">
                    <span className="text-xs font-bold text-[#0B6B6B] uppercase tracking-wider block">Step 1</span>
                    <strong className="text-sm text-[#172B2A] block mt-1">1–2 Days</strong>
                    <span className="text-xs text-[#5A6E6A] block mt-0.5">Order Packing &amp; Dispatch</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF8F2] border border-[#E6DFD5]">
                    <span className="text-xs font-bold text-[#0B6B6B] uppercase tracking-wider block">Step 2 (Kerala)</span>
                    <strong className="text-sm text-[#172B2A] block mt-1">3–5 Days</strong>
                    <span className="text-xs text-[#5A6E6A] block mt-0.5">Doorstep Delivery in Kerala</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF8F2] border border-[#E6DFD5]">
                    <span className="text-xs font-bold text-[#0B6B6B] uppercase tracking-wider block">Step 3 (Pan-India)</span>
                    <strong className="text-sm text-[#172B2A] block mt-1">4–10 Days</strong>
                    <span className="text-xs text-[#5A6E6A] block mt-0.5">Delivery to Other States</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Order Tracking & Cash on Delivery */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Tracking &amp; Payment</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Order Tracking &amp; Cash on Delivery</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Tracking */}
              <div className="space-y-3 p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5]">
                <h3 className="font-bold text-base text-[#172B2A] flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#0B6B6B]" />
                  <span>Order tracking</span>
                </h3>
                <p className="text-sm text-[#3A4E4B] leading-relaxed">
                  When your order is dispatched, we send the tracking details by SMS / WhatsApp to the phone number you gave at checkout. You can also call us on <a href="tel:7593875934" className="text-[#0B6B6B] font-bold hover:underline">7593875934</a> to check your order.
                </p>
                <div className="pt-2">
                  <a
                    href="https://wa.me/917593875934?text=Hello%20Panakkal%20Ayurveda%20Pharmacy,%20I%20would%20like%20to%20track%20my%20order"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#0B6B6B] hover:text-[#085555] bg-white px-3 py-1.5 rounded-lg border border-[#C5E3DF] shadow-2xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>Inquire via WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Cash on Delivery */}
              <div className="space-y-3 p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5]">
                <h3 className="font-bold text-base text-[#172B2A] flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-[#B8860B]" />
                  <span>Cash on delivery</span>
                </h3>
                <p className="text-sm text-[#3A4E4B] leading-relaxed">
                  Cash on delivery is available across India. Please keep the exact amount ready when the parcel arrives.
                </p>
                <div className="pt-2 text-xs text-[#5A6E6A] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0B6B6B]" />
                  <span>No additional COD fee is charged.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Returns Policy */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Quality &amp; Safety</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Returns</h2>
              </div>
            </div>

            {/* Ayurvedic Medicated Product Notice */}
            <div className="rounded-2xl p-5 bg-[#FFF9ED] border border-[#F0D5A3] space-y-2">
              <div className="flex items-center gap-2 text-[#9A6B1F]">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-[#172B2A]">Medicated Ayurvedic Product Policy</h3>
              </div>
              <p className="text-sm text-[#5C4318] leading-relaxed">
                Bhramananthu Oil is a medicated Ayurvedic product. For hygiene and safety reasons, opened or used bottles cannot be returned.
              </p>
            </div>

            {/* Damaged, leaking or wrong products */}
            <div className="space-y-4 pt-2">
              <h3 className="font-bold text-base sm:text-lg text-[#172B2A]">
                Damaged, leaking or wrong products
              </h3>
              <p className="text-sm text-[#3A4E4B] leading-relaxed">
                If your parcel arrives damaged, the bottle is leaking or broken, or you received the wrong product:
              </p>

              <ol className="space-y-3 text-sm sm:text-base text-[#3A4E4B]">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#E8F3F1] text-[#0B6B6B] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Contact us within <strong>48 hours</strong> of delivery on call / WhatsApp{" "}
                    <a href="tel:7593875934" className="text-[#0B6B6B] font-bold hover:underline">7593875934</a>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#E8F3F1] text-[#0B6B6B] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Send a photo of the parcel and the product, with your order number.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#E8F3F1] text-[#0B6B6B] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    We will send a <strong>free replacement</strong> or give a <strong>full refund</strong>, as you prefer.
                  </span>
                </li>
              </ol>

              <div className="p-4 rounded-xl bg-[#FAF8F2] border border-[#E6DFD5] text-xs text-[#5A6E6A] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#0B6B6B] shrink-0" />
                <span>Please do not throw away the packaging until the issue is sorted.</span>
              </div>
            </div>
          </section>

          {/* Section 5: Cancellations & Refunds */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Order Adjustments</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Cancellations &amp; Refunds</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cancellations */}
              <div className="space-y-3 p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5]">
                <h3 className="font-bold text-base text-[#172B2A]">Cancellations</h3>
                <ul className="space-y-2.5 text-sm text-[#3A4E4B]">
                  <li className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                    <span>
                      You can cancel your order any time before it is dispatched by calling or WhatsApping us. You will get a full refund.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                    <span>
                      Once the order has been dispatched, it cannot be cancelled.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Refunds */}
              <div className="space-y-3 p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5]">
                <h3 className="font-bold text-base text-[#172B2A]">Refunds</h3>
                <ul className="space-y-2.5 text-sm text-[#3A4E4B]">
                  <li className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                    <span>
                      Online payments are refunded to the same account or card within <strong className="text-[#172B2A]">5–7 working days</strong> after the refund is approved.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                    <span>
                      For cash on delivery orders, we refund to your bank account or UPI ID after confirming your details.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 6: Contact Us */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Support Assistance</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Contact Us</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Phone / WhatsApp */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-2">
                <div className="w-9 h-9 rounded-lg bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5A6E6A]">Phone / WhatsApp</p>
                <div className="space-y-1">
                  <a
                    href="tel:7593875934"
                    className="block font-bold text-base text-[#172B2A] hover:text-[#0B6B6B] transition-colors"
                  >
                    7593875934
                  </a>
                  <a
                    href="https://wa.me/917593875934?text=Hello%20Panakkal%20Ayurveda%20Pharmacy"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#0B6B6B] font-semibold hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>Chat on WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-2">
                <div className="w-9 h-9 rounded-lg bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5A6E6A]">Email</p>
                <div>
                  <a
                    href="mailto:info@bhramananthu.com"
                    className="font-bold text-sm sm:text-base text-[#172B2A] hover:text-[#0B6B6B] transition-colors break-all"
                  >
                    info@bhramananthu.com
                  </a>
                </div>
                <p className="text-xs text-[#5A6E6A]">Replies within 24 hours</p>
              </div>

              {/* Address */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-2 sm:col-span-1">
                <div className="w-9 h-9 rounded-lg bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5A6E6A]">Address</p>
                <p className="text-xs sm:text-sm text-[#172B2A] font-medium leading-relaxed">
                  Panakkal Ayurveda Pharmacy, Vilanganur, Peechi P.O, Thrissur – 680653, Kerala, India
                </p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Branded Footer matching Store Aesthetic */}
      <BhramananthuFooter />
    </div>
  );
}
