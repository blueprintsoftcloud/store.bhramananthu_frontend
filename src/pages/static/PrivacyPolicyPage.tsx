import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Eye,
  Share2,
  Cookie,
  Clock,
  UserCheck,
  UserX,
  FileText,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import PageSeo from "../../components/seo/PageSeo";
import BhramananthuFooter from "../../components/BhramananthuFooter";

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-[#FAF8F2] min-h-screen font-sans flex flex-col text-[#172B2A] selection:bg-[#0B6B6B]/20 selection:text-[#0B6B6B]">
      <PageSeo
        title="Privacy Policy | Bhramananthu Oil"
        description="Official Privacy Policy for Bhramananthu Oil, operated by Panakkal Ayurveda Pharmacy. Learn how we collect, use, and protect your personal information in compliance with Indian law."
        path="/privacy-policy"
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
                Privacy Policy
              </h1>

              <p className="text-[#A2B8B4] text-sm sm:text-base leading-relaxed max-w-3xl pt-1">
                <span className="text-white font-medium">Panakkal Ayurveda Pharmacy</span> (“we”) runs{" "}
                <span className="text-white font-medium">store.bhramananthu.com</span>. This policy explains what personal information we collect when you use our store, why we collect it, and how we protect it. We follow the{" "}
                <strong className="text-white font-semibold">Digital Personal Data Protection Act, 2023</strong> and other Indian laws that apply.
              </p>
            </div>
          </div>

          {/* Section 1: Information We Collect */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Data Collection</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Information We Collect</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#3A4E4B]">
              <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-1.5">
                <strong className="text-[#172B2A] block font-semibold text-base">Contact details</strong>
                <p className="leading-relaxed">Your name, mobile number and email address.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-1.5">
                <strong className="text-[#172B2A] block font-semibold text-base">Delivery details</strong>
                <p className="leading-relaxed">Your delivery address and PIN code.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-1.5">
                <strong className="text-[#172B2A] block font-semibold text-base">Order details</strong>
                <p className="leading-relaxed">The products you buy, order amount and order history.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-1.5">
                <strong className="text-[#172B2A] block font-semibold text-base">Messages</strong>
                <p className="leading-relaxed">If you call, WhatsApp, email us or write a review, we keep what you send us.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-1.5 md:col-span-2">
                <strong className="text-[#172B2A] block font-semibold text-base">Payment details</strong>
                <p className="leading-relaxed">
                  Your payment is handled by our secure payment partners. We do not see or store your full card number, UPI PIN or net banking password.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-1.5 md:col-span-2">
                <strong className="text-[#172B2A] block font-semibold text-base">Website usage</strong>
                <p className="leading-relaxed">
                  Basic information such as your device, browser and pages visited, collected through cookies and similar tools.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: How We Use Your Information */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Usage &amp; Purpose</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">How We Use Your Information</h2>
              </div>
            </div>

            <ul className="space-y-3.5 text-sm sm:text-base text-[#3A4E4B]">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0B6B6B] shrink-0 mt-0.5" />
                <span>To process and deliver your order, and send order and delivery updates.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0B6B6B] shrink-0 mt-0.5" />
                <span>To answer your questions and support requests.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0B6B6B] shrink-0 mt-0.5" />
                <span>To verify your mobile number when you sign in (OTP).</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0B6B6B] shrink-0 mt-0.5" />
                <span>To improve our website and products.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0B6B6B] shrink-0 mt-0.5" />
                <span>To send offers or product news, only if you agree. You can stop these at any time.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#0B6B6B] shrink-0 mt-0.5" />
                <span>To meet legal, tax and accounting requirements.</span>
              </li>
            </ul>
          </section>

          {/* Section 3: Who We Share It With */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Third-Party Sharing</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Who We Share It With</h2>
              </div>
            </div>

            <p className="text-sm sm:text-base text-[#3A4E4B]">
              We share your information only when needed to serve you:
            </p>

            <ul className="space-y-3 text-sm sm:text-base text-[#3A4E4B]">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>Courier and delivery partners, to deliver your order.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>Payment partners, to process your payment.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>SMS, WhatsApp and email service providers, to send order updates.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                <span>Government or legal authorities, when the law requires it.</span>
              </li>
            </ul>

            <div className="p-4 rounded-2xl bg-[#E8F3F1]/60 border border-[#C5E3DF] text-sm text-[#0B6B6B] font-bold flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#0B6B6B] shrink-0" />
              <span>We do not sell your personal information to anyone.</span>
            </div>
          </section>

          {/* Section 4: Cookies, Advertising & Retention */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cookies & Advertising */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-3">
                <div className="flex items-center gap-2.5 text-[#0B6B6B]">
                  <Cookie className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#172B2A]">Cookies and advertising</h3>
                </div>
                <p className="text-sm text-[#3A4E4B] leading-relaxed">
                  We use cookies to keep your cart working and to understand how visitors use the site. We also use advertising tools such as the Meta Pixel and Google Ads to measure our ads. These tools may collect information about your visit. You can block or delete cookies in your browser settings.
                </p>
              </div>

              {/* Data Retention */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-3">
                <div className="flex items-center gap-2.5 text-[#0B6B6B]">
                  <Clock className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#172B2A]">How long we keep your information</h3>
                </div>
                <p className="text-sm text-[#3A4E4B] leading-relaxed">
                  We keep your information while you are our customer and for as long as the law requires, for example for tax and accounting records. After that, we delete it or make it anonymous.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Your Rights & How We Protect Your Information */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Your Rights */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-3">
                <div className="flex items-center gap-2.5 text-[#0B6B6B]">
                  <UserCheck className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#172B2A]">Your rights</h3>
                </div>
                <p className="text-sm text-[#3A4E4B]">You can ask us to:</p>
                <ul className="space-y-2 text-sm text-[#3A4E4B]">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                    <span>See the personal information we hold about you.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                    <span>Correct or update it.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                    <span>Delete it, unless we must keep it by law.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0B6B6B] mt-2 shrink-0" />
                    <span>Stop sending you offers and promotional messages.</span>
                  </li>
                </ul>
                <p className="text-xs text-[#5A6E6A] pt-1">
                  To do this, contact us using the details below.
                </p>
              </div>

              {/* How We Protect Your Information */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border border-[#E6DFD5] space-y-3">
                <div className="flex items-center gap-2.5 text-[#0B6B6B]">
                  <Lock className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#172B2A]">How we protect your information</h3>
                </div>
                <p className="text-sm text-[#3A4E4B] leading-relaxed">
                  We use secure connections (HTTPS) and limit access to your information to staff and partners who need it to serve you.
                </p>
                <div className="pt-2 text-xs text-[#5A6E6A] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0B6B6B]" />
                  <span>Encrypted end-to-end data transmission</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Children & Changes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E6DFD5] space-y-2">
              <div className="flex items-center gap-2 text-[#0B6B6B]">
                <UserX className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#172B2A]">Children</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#5A6E6A] leading-relaxed">
                Our store is meant for adults. We do not knowingly collect information from children under 18.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E6DFD5] space-y-2">
              <div className="flex items-center gap-2 text-[#0B6B6B]">
                <FileText className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#172B2A]">Changes to this policy</h3>
              </div>
              <p className="text-xs sm:text-sm text-[#5A6E6A] leading-relaxed">
                If we change this policy, we will update the date at the top of this page.
              </p>
            </div>
          </div>

          {/* Section 7: Grievance Officer / Contact */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6DFD5] shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#F0EBE1]">
              <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#0B6B6B] flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider uppercase text-[#0B6B6B]">Compliance &amp; Inquiries</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#172B2A]">Grievance Officer / Contact</h2>
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
                <p className="text-xs text-[#5A6E6A]">Grievance responses within 24-48 hours</p>
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
