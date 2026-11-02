import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Printer, Download, ArrowLeft, CheckCircle, Clock, XCircle, Truck, Package, RotateCcw } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import panakkalLogo from "../assets/Panakkallogo.png";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface CompanySettings {
  COMPANY_NAME: string | null;
  COMPANY_TAGLINE: string | null;
  COMPANY_LOGO: string | null;
  INVOICE_FORMAT?: string | null;
}

interface OrderItem {
  product: { id: string; name: string; image?: string; code?: string; price?: number; discount?: number } | null;
  quantity: number;
  price: number;
  variant?: {
    id?: string;
    options: Record<string, string>;
    priceOverride?: number | null;
    discountOverride?: number | null;
    image?: string | null;
    secondaryImage?: string | null;
  } | null;
}

const formatVariantOptions = (variant: OrderItem["variant"]): string =>
  variant?.options ? Object.entries(variant.options).map(([axis, value]) => `${axis}: ${value}`).join(" · ") : "";

export const getItemOriginalPrice = (item: OrderItem): number | null => {
  const baseProductPrice = item.product?.price ?? 0;

  // Extract pack quantity from variant options or item product name
  let packNum = 1;
  if (item.variant?.options) {
    for (const val of Object.values(item.variant.options)) {
      const match = String(val).match(/(\d+)\s*(?:bottle|pack|piece|pc|item)/i) || String(val).match(/^(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > 1) {
          packNum = n;
          break;
        }
      }
    }
  }

  if (packNum === 1 && item.product?.name) {
    const match = item.product.name.match(/pack\s*(?:of)?\s*(\d+)/i) || item.product.name.match(/(\d+)\s*bottles?/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > 1) packNum = n;
    }
  }

  // Benchmark valuation: base price * packNum
  const packBenchmark = baseProductPrice > 0 ? baseProductPrice * packNum : 0;
  const varEnteredPrice = item.variant?.priceOverride ?? baseProductPrice;
  const discountPct = item.variant?.discountOverride ?? item.product?.discount ?? 0;

  let computedOriginal = 0;
  if (discountPct > 0 && varEnteredPrice > 0) {
    computedOriginal = varEnteredPrice;
  } else if (packBenchmark > item.price) {
    computedOriginal = packBenchmark;
  } else if (varEnteredPrice > item.price) {
    computedOriginal = varEnteredPrice;
  }

  const strikethroughPrice = Math.max(computedOriginal, packBenchmark, varEnteredPrice);

  if (strikethroughPrice > item.price) {
    return strikethroughPrice;
  }

  return null;
};

interface ShippingAddress {
  fullAddress?: string;
  locality?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  secondaryPhone?: string;
}

interface Coupon {
  code: string;
  discountType: string;
  discountValue: number;
}

interface OrderUser {
  username: string;
  email: string;
  phone?: string;
}

interface Order {
  id: string;
  createdAt: string;
  user?: OrderUser;
  items: OrderItem[];
  totalAmount: number;
  shippingCharge: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  transactionId?: string;
  paymentScreenshot?: string;
  shippingAddress: ShippingAddress;
  coupon?: Coupon | null;
  invoicePrinted?: boolean;
  invoicePrintedAt?: string | null;
}

/* ─── Status Metadata ────────────────────────────────────────────────────────── */
const statusMeta: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PROCESSING: { label: "Processing", color: "#d97706", icon: Clock },
  CONFIRMED:  { label: "Confirmed",  color: "#2563eb", icon: CheckCircle },
  SHIPPED:    { label: "Shipped",    color: "#0891b2", icon: Truck },
  DELIVERED:  { label: "Delivered",  color: "#16a34a", icon: Package },
  CANCELLED:  { label: "Cancelled",  color: "#dc2626", icon: XCircle },
  RETURNED:   { label: "Returned",   color: "#7c3aed", icon: RotateCcw },
};

const paymentStatusMeta: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Pending",  color: "#d97706" },
  PAID:     { label: "Paid",     color: "#16a34a" },
  FAILED:   { label: "Failed",   color: "#dc2626" },
  REFUNDED: { label: "Refunded", color: "#7c3aed" },
};

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function InvoicePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Role detection: Admins/Staff can toggle between Thermal (4x6) and Customer Slip (A4)
  const canChooseFormat = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(user?.role ?? "");
  const isCustomer = !canChooseFormat;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<"A4" | "THERMAL">(isCustomer ? "A4" : "THERMAL");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isCustomer) {
      setSelectedFormat("A4");
    }
  }, [isCustomer]);

  useEffect(() => {
    if (!orderId) return;
    api.get(`/order/${orderId}`)
      .then((res) => setOrder(res.data.order))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 403) setError("You are not authorised to view this order confirmation slip.");
        else if (status === 404) setError("Order not found.");
        else setError("Failed to load order confirmation slip. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  const autoMarkPrinted = async () => {
    if (!orderId || !canChooseFormat || order?.invoicePrinted) return;
    try {
      await api.post("/order/mark-invoices-printed", {
        orderIds: [orderId],
        printed: true,
      });
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              invoicePrinted: true,
              invoicePrintedAt: new Date().toISOString(),
            }
          : prev
      );
    } catch (err) {
      console.error("Auto mark invoice printed failed", err);
    }
  };

  const handleTogglePrinted = async () => {
    if (!orderId || !canChooseFormat || !order) return;
    const target = !order.invoicePrinted;
    try {
      await api.post("/order/mark-invoices-printed", {
        orderIds: [orderId],
        printed: target,
      });
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              invoicePrinted: target,
              invoicePrintedAt: target ? new Date().toISOString() : null,
            }
          : prev
      );
      toast.success(target ? "Order confirmation slip marked as printed" : "Order confirmation slip marked as unprinted");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update print status");
    }
  };

  const handlePrint = () => {
    window.print();
    if (canChooseFormat && !order?.invoicePrinted) {
      autoMarkPrinted();
    }
  };

  /* ── Skeleton / Error states ── */
  if (loading) {
    return (
      <Loader
        fullScreen={false}
        message="Loading Order Confirmation Slip..."
        className="min-h-screen"
      />
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F2] px-4">
        <div className="max-w-md text-center p-8 bg-white rounded-3xl border border-[#E6DFD5] shadow-xs">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-serif font-bold text-[#172B2A] mb-2">Error</h2>
          <p className="text-sm text-[#4A5554] mb-6">{error ?? "Order not found."}</p>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3.5 px-6 bg-[#0B6B6B] text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-[#084E4E] transition cursor-pointer shadow-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const addr = order.shippingAddress ?? {};
  const orderMeta = statusMeta[order.orderStatus] ?? { label: order.orderStatus, color: "#6b7280", icon: Package };
  const payMeta = paymentStatusMeta[order.paymentStatus] ?? { label: order.paymentStatus, color: "#6b7280" };
  const invoiceNumber = `INV-${order.id.slice(-10).toUpperCase()}`;

  const customerName = (addr as any)?.fullName || (addr as any)?.name || order.user?.username || "Customer";
  const customerPhone = (addr as any)?.phone || order.user?.phone || "";
  const customerEmail = order.user?.email || "";
  const fullAddress = addr.fullAddress || (addr as any)?.address || "";
  const secondaryPhone = addr?.secondaryPhone || (addr as any)?.alternatePhone || "";
  const phoneNumbers = Array.from(new Set([customerPhone, secondaryPhone].filter(Boolean))).join(", ");

  const formatThermalDate = (dateStr?: string | Date) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()] || "Oct";
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const getThermalPaymentMethod = (method?: string) => {
    const m = (method || "").toUpperCase().trim();
    if (m === "POD" || m === "COD" || m.includes("DELIVERY")) {
      return "CASH ON DELIVERY";
    }
    if (m === "ONLINE" || m === "RAZORPAY") {
      return "ONLINE PAYMENT";
    }
    if (m === "QR" || m === "UPI") {
      return "UPI / QR PAYMENT";
    }
    if (m === "CASH" || m === "CASH COLLECTED" || m === "CASH_COLLECTED" || m === "PREPAID") {
      return "PREPAID";
    }
    return m || "PREPAID";
  };

  const addressLines: string[] = [];
  if (fullAddress) {
    fullAddress
      .split(/\n+/)
      .flatMap((part) => part.split(","))
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((item) => {
        addressLines.push(item);
      });
  }
  if (addr.locality && addr.locality.trim()) {
    const rawLoc = addr.locality.trim();
    const isAlreadyPresent = addressLines.some((l) =>
      l.toLowerCase().includes(rawLoc.toLowerCase())
    );
    if (!isAlreadyPresent) {
      const hasPoSuffix = /(?:\b(?:p\.?o\.?|s\.?o\.?|b\.?o\.?|h\.?o\.?|post\s*office)|\(p\.?o\.?\))$/i.test(rawLoc);
      const formattedLoc = hasPoSuffix ? rawLoc : `${rawLoc} P.O.`;
      addressLines.push(formattedLoc);
    }
  }
  const cityStateZip = [addr.city, addr.state].filter(Boolean).join(", ") + (addr.zipCode ? ` - ${addr.zipCode}` : "");
  if (cityStateZip && !addressLines.some((l) => l.includes(addr.zipCode || "____"))) {
    addressLines.push(cityStateZip);
  }

  const thermalDate = formatThermalDate(order.createdAt);
  const slipDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const thermalPaymentMethod = getThermalPaymentMethod(order.paymentMethod);

  const totalItemSavings = (order.items || []).reduce((acc, it) => {
    const orig = getItemOriginalPrice(it);
    return acc + (orig && orig > it.price ? (orig - it.price) * it.quantity : 0);
  }, 0);
  const totalOrderSavings = totalItemSavings + (order.discountAmount || 0);

  /* ─── A4 Customer Confirmation Slip PDF Generator (Identical to On-Screen Invoice) ─── */
  const handleDownloadA4Pdf = async () => {
    if (!invoiceRef.current) return;
    try {
      setDownloading(true);
      const target = invoiceRef.current;
      const canvas = await html2canvas(target, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 8;
      const printWidth = pdfWidth - margin * 2;
      const printHeight = (canvas.height * printWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", margin, margin, printWidth, Math.min(printHeight, pdfHeight - margin * 2));
      pdf.save(`Order-Confirmation-${order.id.slice(-8).toUpperCase()}.pdf`);
      toast.success("Order confirmation slip downloaded successfully!");
      if (canChooseFormat && !order.invoicePrinted) {
        autoMarkPrinted();
      }
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      toast.error("Opening print dialog instead.");
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  /* ─── Thermal 4" x 6" Shipping Label PDF Generator ─── */
  const handleDownloadThermalPdf = async () => {
    if (!invoiceRef.current) return;
    try {
      setDownloading(true);
      const target = invoiceRef.current;
      const canvas = await html2canvas(target, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [101.6, 152.4], // 4in x 6in
      });

      pdf.addImage(imgData, "PNG", 0, 0, 101.6, 152.4);
      pdf.save(`${invoiceNumber}-4x6.pdf`);
      toast.success("Thermal label downloaded successfully!");
      if (canChooseFormat && !order.invoicePrinted) {
        autoMarkPrinted();
      }
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      toast.error("Opening print dialog instead.");
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveAsPdf = () => {
    if (selectedFormat === "A4") {
      handleDownloadA4Pdf();
    } else {
      handleDownloadThermalPdf();
    }
  };

  return (
    <>
      {/* ─── Print / Download Toolbar (hidden during print) ─── */}
      <div className="print:hidden bg-slate-900 border-b border-slate-800 sticky top-0 z-50 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs font-bold text-slate-200">
              #{order.id.slice(-8).toUpperCase()}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
              {order.orderStatus}
            </span>
            {canChooseFormat && (
              <button
                type="button"
                onClick={handleTogglePrinted}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                  order.invoicePrinted
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30"
                }`}
                title={order.invoicePrinted ? "Order confirmation slip marked as printed (Click to mark unprinted)" : "Order confirmation slip unprinted (Click to mark printed)"}
              >
                {order.invoicePrinted ? (
                  <>
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                    <span>Printed</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    <span>Unprinted</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            {/* Role Header Badge: Shipping Label for Admin, Order Confirmation Slip for Customer */}
            {canChooseFormat ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/15">
                <span>🏷️</span>
                <span>Shipping Label</span>
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/15">
                <span>📄</span>
                <span>Order Confirmation Slip</span>
              </span>
            )}

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer active:scale-98"
            >
              <Printer className="w-3.5 h-3.5 text-slate-900" />
              <span>{selectedFormat === "THERMAL" ? "Print Label" : "Print Slip"}</span>
            </button>

            <button
              onClick={handleSaveAsPdf}
              disabled={downloading}
              className="flex-1 sm:flex-initial justify-center inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer active:scale-98"
            >
              <Download className={`w-3.5 h-3.5 ${downloading ? "animate-bounce" : ""}`} />
              <span>{downloading ? "Generating…" : "Download PDF"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Document Container ─── */}
      <div className="bg-[#FAF8F5] min-h-screen py-4 sm:py-8 px-2 sm:px-4 flex flex-col items-center print:bg-white print:p-0 print:min-h-0">
        {selectedFormat === "A4" ? (
          /* ══════════════════════════════════════════════════════════════════
             CUSTOMER CONFIRMATION ORDER SLIP (A4)
             - Top: Panakkal Ayurveda Pharmacy Logo & Address (NO GST)
             - Products Ordered & Pricing Details
             ══════════════════════════════════════════════════════════════════ */
          <div
            ref={invoiceRef}
            id="invoice-print-area"
            className="w-full max-w-[820px] bg-white shadow-xl rounded-xl sm:rounded-2xl border border-stone-200/90 p-3.5 sm:p-7 md:p-10 font-sans text-stone-900 box-border overflow-hidden print:p-0 print:border-none print:shadow-none print:rounded-none print:max-w-none"
          >
            {/* 1. TOP HEADER: Document Meta Strip + Pharmacy Brand & Address */}
            <div className="pb-4 sm:pb-5 border-b border-stone-200">
              {/* Document Meta Strip: Badge + Order ID + Date + Status */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 pb-2.5 sm:pb-3 mb-3 sm:mb-4 border-b border-stone-100">
                <span className="inline-block px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[10px] sm:text-[11px] font-bold bg-[#0B6B6B]/10 text-[#0B6B6B] border border-[#0B6B6B]/20 uppercase tracking-wider">
                  Order Confirmation Slip
                </span>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs">
                  <span className="font-mono font-bold text-stone-900">
                    #{order.id.slice(-8).toUpperCase()}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span className="text-stone-500 font-medium">{slipDate}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                    <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {order.orderStatus}
                  </span>
                </div>
              </div>

              {/* Pharmacy Identity: Logo & Address */}
              <div className="flex items-start gap-2.5 sm:gap-4">
                <img
                  id="panakkal-slip-logo"
                  src={panakkalLogo}
                  alt="Panakkal Ayurveda Pharmacy"
                  className="w-11 h-11 sm:w-16 sm:h-16 object-contain rounded-lg sm:rounded-xl border border-stone-100 bg-[#FBF9F4] p-0.5 sm:p-1 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="text-xs min-[390px]:text-sm sm:text-lg md:text-xl font-serif font-black tracking-tight sm:tracking-normal md:tracking-wide text-[#0B6B6B] uppercase leading-snug whitespace-nowrap">
                    Panakkal Ayurveda Pharmacy
                  </h1>
                  <p className="text-[11px] sm:text-xs text-stone-600 mt-0.5 sm:mt-1 leading-relaxed">
                    Vilanganur, Peechi P.O, Thrissur – 680653, Kerala, India
                  </p>
                  <div className="mt-1 text-[11px] sm:text-xs text-stone-600 space-y-0.5 font-medium">
                    <p>Ph: <strong className="text-stone-900">+91 7593875934, 0487 2699398</strong></p>
                    <p className="break-all">Email: <strong className="text-stone-900">panakkalayurvedapharmacy@gmail.com</strong></p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CUSTOMER & ORDER DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-4 sm:py-6 border-b border-stone-200">
              {/* Deliver To */}
              <div className="bg-[#FAF8F5] rounded-xl p-3 sm:p-4 border border-stone-200/80">
                <p className="text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1.5">
                  Delivered To
                </p>
                <p className="text-sm font-black uppercase text-stone-900 leading-snug">
                  {customerName}
                </p>
                <div className="mt-1 space-y-0.5">
                  {addressLines.map((line, idx) => (
                    <p key={idx} className="text-xs font-medium text-stone-700 leading-tight">
                      {line}
                    </p>
                  ))}
                </div>
                {phoneNumbers && (
                  <p className="mt-2 text-xs font-bold text-stone-900">
                    Phone: <span className="font-mono">{phoneNumbers}</span>
                  </p>
                )}
                {customerEmail && (
                  <p className="text-xs font-medium text-stone-600 mt-0.5 break-all">
                    Email: {customerEmail}
                  </p>
                )}
              </div>

              {/* Order Info */}
              <div className="bg-[#FAF8F5] rounded-xl p-3 sm:p-4 border border-stone-200/80 flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-wider text-stone-500 mb-2">
                  Order Information
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Order ID:</span>
                    <span className="font-mono font-bold text-stone-900">#{order.id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Placed Date:</span>
                    <span className="font-medium text-stone-800">{slipDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Payment Mode:</span>
                    <span className="font-bold text-stone-900">{thermalPaymentMethod}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. ORDERED PRODUCTS TABLE */}
            <div className="py-4 sm:py-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-600 mb-2.5 sm:mb-3">
                Ordered Products
              </h3>
              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full min-w-[320px] text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B6B6B] text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2 sm:py-2.5 px-2 sm:px-3 w-8 sm:w-10 text-center">#</th>
                      <th className="py-2 sm:py-2.5 px-2 sm:px-3">Item Description</th>
                      <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-right">Price</th>
                      <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-center">Qty</th>
                      <th className="py-2 sm:py-2.5 px-2 sm:px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-xs">
                    {order.items.map((item, idx) => {
                      const originalPrice = getItemOriginalPrice(item);
                      const hasSavings = originalPrice && originalPrice > item.price;
                      const unitSavings = hasSavings ? originalPrice - item.price : 0;
                      const itemTotalSavings = hasSavings ? unitSavings * item.quantity : 0;

                      return (
                        <tr key={idx} className={idx % 2 === 1 ? "bg-stone-50/60" : "bg-white"}>
                          <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-center font-bold text-stone-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 sm:py-3 px-2 sm:px-3">
                            <p className="font-bold text-stone-900 text-xs sm:text-sm">
                              {item.product?.name ?? "Product Unavailable"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              {formatVariantOptions(item.variant) && (
                                <span className="text-[10px] sm:text-[11px] text-stone-500 font-medium">
                                  {formatVariantOptions(item.variant)}
                                </span>
                              )}
                              {hasSavings && (
                                <span className="inline-flex items-center text-[10px] sm:text-[11px] font-semibold text-emerald-700 underline decoration-dotted decoration-emerald-600/60">
                                  You save ₹{Math.round(itemTotalSavings).toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-right">
                            {hasSavings && (
                              <div className="text-[10px] sm:text-[11px] text-stone-400 line-through font-mono font-medium leading-tight">
                                ₹{originalPrice.toFixed(2)}
                              </div>
                            )}
                            <div className="font-mono text-stone-900 font-bold text-xs sm:text-sm leading-tight">
                              ₹{item.price.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-center font-bold text-stone-900">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-right">
                            {hasSavings && (
                              <div className="text-[10px] sm:text-[11px] text-stone-400 line-through font-mono font-medium leading-tight">
                                ₹{(originalPrice * item.quantity).toFixed(2)}
                              </div>
                            )}
                            <div className="font-mono font-bold text-stone-900 text-xs sm:text-sm leading-tight">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. TOTALS SUMMARY (Strictly NO GST) */}
            <div className="flex justify-end pt-2 pb-6 border-b border-stone-200">
              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Items Subtotal</span>
                  <span className="font-mono font-medium">₹{order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Shipping & Delivery</span>
                  <span className="font-mono font-medium">
                    {order.shippingCharge > 0 ? `₹${order.shippingCharge.toFixed(2)}` : "FREE"}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount {order.coupon ? `(${order.coupon.code})` : ""}</span>
                    <span className="font-mono">-₹{order.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2.5 border-t border-stone-300 font-black text-stone-900 text-sm">
                  <span className="uppercase tracking-wider">Total Amount</span>
                  <span className="font-mono text-base text-[#0B6B6B]">
                    ₹{Math.round(order.finalAmount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. FOOTER */}
            <div className="pt-6 text-center text-xs text-stone-500">
              <p className="font-serif font-bold text-[#0B6B6B] text-sm">
                Thank you for choosing Panakkal Ayurveda Pharmacy
              </p>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
             ADMIN 4″ × 6″ THERMAL SHIPPING LABEL
             ══════════════════════════════════════════════════════════════════ */
          <div
            ref={invoiceRef}
            id="invoice-print-area"
            className="w-full max-w-[384px] bg-white shadow-xl rounded-sm p-[0.12in] print:p-[0.12in] print:m-0 print:shadow-none print:max-w-none box-border font-sans text-black"
          >
            <div className="border-[1.5px] border-black flex flex-col justify-between min-h-[550px] h-full bg-white">
              {/* 1. CUSTOMER DELIVERY ADDRESS (TO:) - Bold with Space After */}
              <div className="p-4 bg-white">
                <p className="text-xs font-black uppercase tracking-wider text-black mb-1.5">
                  TO:
                </p>
                <p className="text-base font-black uppercase text-black leading-tight">
                  {customerName}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  {addressLines.map((line, idx) => (
                    <p key={idx} className="text-sm font-bold uppercase text-black leading-snug">
                      {line}
                    </p>
                  ))}
                </div>
                {phoneNumbers && (
                  <p className="mt-2.5 text-sm font-black uppercase text-black">
                    MOB: {phoneNumbers}
                  </p>
                )}
              </div>

              {/* BOTTOM SECTION (Meta Strip + Table + Charges + Footer Banner) */}
              <div className="mt-auto border-t-[1.5px] border-black">
                {/* 2. ORDER META STRIP */}
                <div className="grid grid-cols-3 border-b-[1.5px] border-black text-xs divide-x-[1.5px] divide-black bg-gray-50">
                  <div className="px-2 py-1.5 text-center">
                    <p className="text-[8.5px] font-black uppercase tracking-wider text-gray-500">DATE</p>
                    <p className="text-[10.5px] font-bold text-black uppercase mt-0.5">{thermalDate}</p>
                  </div>
                  <div className="px-2 py-1.5 text-center">
                    <p className="text-[8.5px] font-black uppercase tracking-wider text-gray-500">ORDER NO</p>
                    <p className="text-[10.5px] font-mono font-bold text-black uppercase mt-0.5">#{order.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div className="px-2 py-1.5 text-center">
                    <p className="text-[8.5px] font-black uppercase tracking-wider text-gray-500">PAYMENT</p>
                    <p className="text-[10px] font-bold text-black uppercase mt-0.5 truncate">{thermalPaymentMethod}</p>
                  </div>
                </div>

                {/* 3. ITEMS TABLE */}
                <div className="border-b-[1.5px] border-black">
                  <div className="flex border-b-[1.5px] border-black text-[10px] font-black uppercase tracking-wider text-black bg-gray-100">
                    <div className="w-[52%] px-2.5 py-1.5 border-r-[1.5px] border-black text-left">
                      ITEM
                    </div>
                    <div className="w-[24%] px-2.5 py-1.5 border-r-[1.5px] border-black text-center">
                      QUANTITY
                    </div>
                    <div className="w-[24%] px-2.5 py-1.5 text-right">
                      PRICE
                    </div>
                  </div>

                  {order.items.map((item, idx) => {
                    const originalPrice = getItemOriginalPrice(item);
                    const hasSavings = originalPrice && originalPrice > item.price;

                    return (
                      <div key={idx} className="flex border-b border-black text-xs text-black last:border-b-0">
                        <div className="w-[52%] px-2.5 py-1.5 border-r-[1.5px] border-black text-left">
                          <p className="font-bold text-[11px] uppercase leading-tight">
                            {item.product?.name ?? "Product Unavailable"}
                          </p>
                          {formatVariantOptions(item.variant) && (
                            <p className="text-[9.5px] font-medium text-gray-600 mt-0.5">
                              {formatVariantOptions(item.variant)}
                            </p>
                          )}
                          {hasSavings && (
                            <p className="text-[9px] font-bold text-gray-700 mt-0.5">
                              Save ₹{Math.round((originalPrice - item.price) * item.quantity)}
                            </p>
                          )}
                        </div>
                        <div className="w-[24%] px-2.5 py-1.5 border-r-[1.5px] border-black text-center font-bold tabular-nums">
                          {item.quantity}
                        </div>
                        <div className="w-[24%] px-2.5 py-1.5 text-right tabular-nums">
                          {hasSavings && (
                            <div className="text-[9.5px] text-gray-500 line-through leading-tight">
                              ₹{Math.round(originalPrice * item.quantity)}
                            </div>
                          )}
                          <div className="font-bold leading-tight">
                            ₹{Math.round(item.price * item.quantity)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 4. CHARGES & TOTAL */}
                <div className="border-b-[1.5px] border-black text-xs">
                  <div className="flex justify-between border-b border-black px-3 py-1 font-bold text-black">
                    <span className="text-[10px] uppercase text-gray-700">SHIPPING CHARGES</span>
                    <span className="text-[11px] tabular-nums font-mono">
                      {order.shippingCharge > 0 ? `₹${Math.round(order.shippingCharge)}` : "FREE"}
                    </span>
                  </div>

                  {order.discountAmount > 0 && (
                    <div className="flex justify-between border-b border-black px-3 py-1 font-bold text-black">
                      <span className="text-[10px] uppercase text-gray-700">
                        DISCOUNT{order.coupon ? ` (${order.coupon.code})` : ""}
                      </span>
                      <span className="text-[11px] tabular-nums font-mono text-emerald-800">
                        -₹{Math.round(order.discountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between px-3 py-1.5 font-black text-black bg-gray-50">
                    <span className="text-xs uppercase tracking-wide">TOTAL AMOUNT</span>
                    <span className="text-sm tabular-nums font-mono">
                      ₹{Math.round(order.finalAmount)}
                    </span>
                  </div>
                </div>

                {/* 5. SOLID BLACK FOOTER BANNER */}
                <div className="bg-black text-white text-center py-2.5 px-3">
                  <p className="font-black text-xs uppercase tracking-widest leading-none">
                    THANK YOU FOR YOUR ORDER
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Print Styles ─── */}
      <style>{`
        @page {
          size: ${selectedFormat === "THERMAL" ? "4in 6in" : "A4 portrait"};
          margin: ${selectedFormat === "THERMAL" ? "0mm !important" : "10mm !important"};
        }
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
          #invoice-print-area {
            position: absolute !important;
            top: 0; left: 0;
            ${
              selectedFormat === "THERMAL"
                ? `
                width: 4in !important;
                max-width: 4in !important;
                min-height: 5.9in !important;
                height: 5.95in !important;
                max-height: 6in !important;
                margin: 0 !important;
                padding: 0.12in !important;
                box-sizing: border-box !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                `
                : `
                width: 100% !important;
                max-width: 100% !important;
                min-height: 0 !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                border-radius: 0 !important;
                border: none !important;
                box-shadow: none !important;
                `
            }
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
