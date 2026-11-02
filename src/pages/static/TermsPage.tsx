import React from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Truck,
  MessageSquare,
  Scale,
  Building,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import PageSeo from "../../components/seo/PageSeo";
import BhramananthuFooter from "../../components/BhramananthuFooter";

export default function TermsPage() {
  return (
    <div className="bg-[#FAF8F2] min-h-screen font-sans flex flex-col text-[#172B2A] selection:bg-[#0B6B6B]/20 selection:text-[#0B6B6B]">
      <PageSeo
        title="Terms and Conditions | Bhramananthu Oil"
        description="Official Terms and Conditions for Bhramananthu Oil, operated by Panakkal Ayurveda Pharmacy. Read product guidelines, ordering terms, pricing, and governing law."
        path="/terms"
      />

      {/* Main Content Container with dynamic navbar clearance */}
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
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#0B6B6B]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#B8860B]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Terms and Conditions
              </h1>

              <p className="text-[#A2B8B4] text-sm sm:text-base leading-relaxed max-w-3xl pt-1">
                These terms apply when you use{" "}
                <span className="text-white font-medium">store.bhramananthu.com</span> or buy from it. The store is operated by{" "}
                <span className="text-white font-medium">Panakkal Ayurveda Pharmacy</span>, Vilanganur, Peechi P.O, Thrissur – 680653, Kerala, India. By placing an order, you agree to these terms.
              </p>
            </div>
          </div>

          {/* Section 1: About the product */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Product Guidelines</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">About the Product</h2>
              </div>
            </div>

            <div className="rounded-2xl p-4 sm:p-5 bg-[#FFF9ED] border border-[#F0D5A3] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#9A6B1F] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-[#172B2A] text-sm sm:text-base block">For External Use Only</strong>
                <p className="text-xs sm:text-sm text-[#5C4318] leading-relaxed">
                  Bhramananthu Oil is an Ayurvedic oil formulated strictly for external application. Do not swallow.
                </p>
              </div>
            </div>

            <ul className="space-y-3.5 text-sm sm:text-base text-[#3A4E4B]">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>
                  Use it as described on the pack and on this website, or as advised by an Ayurvedic practitioner.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>
                  If you are pregnant, breastfeeding, have a medical condition or take regular medicines, consult your doctor before use.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>
                  Keep out of the reach of children.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 2: Orders & Eligibility */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Placement &amp; Verification</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Orders</h2>
              </div>
            </div>

            <ul className="space-y-3.5 text-sm sm:text-base text-[#3A4E4B]">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>
                  You must be <strong className="text-[#172B2A]">18 years or older</strong> to place an order.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>
                  Please give a correct name, phone number and full delivery address. We are not responsible for delays caused by wrong details.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>
                  We confirm your order by SMS / WhatsApp / email.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 3: Prices and payment */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Pricing &amp; Methods</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Prices and Payment</h2>
              </div>
            </div>

            <ul className="space-y-3.5 text-sm sm:text-base text-[#3A4E4B]">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>
                  All prices are in Indian Rupees (₹) and include all taxes.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>
                  Delivery charges, if any, are shown at checkout before you pay.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>
                  We accept UPI, debit and credit cards, net banking and cash on delivery. Online payments are processed securely by payment partner.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>
                  Pack offers (for example 2 or 3 bottles) are valid only as shown on the website at the time of ordering.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 4: Shipping, returns and refunds */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Fulfillment Policy</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Shipping, Returns and Refunds</h2>
              </div>
            </div>

            <p className="text-sm sm:text-base text-[#3A4E4B] leading-relaxed">
              Delivery, returns, cancellations and refunds are covered in detail in our{" "}
              <Link
                to="/shipping-policy"
                className="text-[#0B6B6B] font-bold hover:text-[#085555] underline decoration-[#0B6B6B]/40 hover:decoration-[#0B6B6B] transition-colors"
              >
                Shipping and Returns Policy
              </Link>.
            </p>
          </section>

          {/* Section 5: Reviews & Website content */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reviews */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-3">
                <div className="flex items-center gap-2.5 text-[#0B6B6B]">
                  <MessageSquare className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#172B2A]">Reviews</h3>
                </div>
                <ul className="space-y-2 text-sm text-[#3A4E4B]">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                    <span>Reviews must be your own honest experience of the product.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                    <span>We may remove reviews that are false, offensive, or contain personal details or medical claims.</span>
                  </li>
                </ul>
              </div>

              {/* Website content */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-3">
                <div className="flex items-center gap-2.5 text-[#0B6B6B]">
                  <Building className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#172B2A]">Website content</h3>
                </div>
                <p className="text-sm text-[#3A4E4B] leading-relaxed">
                  All text, images, videos and the Bhramananthu name and logo belong to Panakkal Ayurveda Pharmacy. Please do not copy or use them without our written permission.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Limitation of liability & Changes */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Legal Scope</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Liability &amp; Governing Law</h2>
              </div>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-[#3A4E4B]">
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-2">
                <strong className="block text-base text-[#172B2A]">Limitation of liability</strong>
                <p className="leading-relaxed">
                  We are responsible for providing the product as described. We are not liable for problems caused by using the product against the directions, or for delays caused by courier partners or events outside our control, such as floods or strikes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-1.5">
                  <strong className="block text-sm text-[#172B2A]">Changes to these terms</strong>
                  <p className="text-xs sm:text-sm text-[#5A6E6A] leading-relaxed">
                    We may update these terms from time to time. The version on this page at the time of your order applies to that order.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-1.5">
                  <strong className="block text-sm text-[#172B2A]">Governing law</strong>
                  <p className="text-xs sm:text-sm text-[#5A6E6A] leading-relaxed">
                    These terms are governed by the laws of India. Any dispute is subject to the courts of Thrissur, Kerala.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: Contact / Grievance Officer */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Support &amp; Inquiries</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Contact / Grievance Officer</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Name & Phone */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-2">
                <div className="w-9 h-9 rounded-lg bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5A6E6A]">Grievance Officer</p>
                <div className="space-y-1">
                  <strong className="block text-base text-[#172B2A]">Jibin Panakkal</strong>
                  <a
                    href="tel:+919947603194"
                    className="block text-sm font-semibold text-[#0B6B6B] hover:underline"
                  >
                    +91 99476 03194
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-2">
                <div className="w-9 h-9 rounded-lg bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5A6E6A]">Official Email</p>
                <div>
                  <a
                    href="mailto:info@bhramananthu.com"
                    className="font-bold text-sm sm:text-base text-[#172B2A] hover:text-[#0B6B6B] transition-colors break-all"
                  >
                    info@bhramananthu.com
                  </a>
                </div>
                <p className="text-xs text-[#5A6E6A]">Assistance within 24-48 hours</p>
              </div>

              {/* Address */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-2">
                <div className="w-9 h-9 rounded-lg bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5A6E6A]">Postal Address</p>
                <p className="text-xs sm:text-sm text-[#172B2A] font-medium leading-relaxed">
                  Panakkal Ayurveda Pharmacy, Vilanganur, Peechi P.O, Thrissur – 680653, Kerala, India
                </p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Branded Store Footer */}
      <BhramananthuFooter />
    </div>
  );
}
