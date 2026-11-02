// src/dashboard/BulkInvoiceModal.tsx
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { jsPDF } from "jspdf";
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Receipt,
  Layers,
  Calendar,
  CreditCard,
  Building2,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import { ClipLoader } from "react-spinners";
import toast from "react-hot-toast";
import api from "../utils/api";
import { getItemOriginalPrice } from "../pages/InvoicePage";

interface BulkInvoiceOrder {
  id: string;
  createdAt: string;
  totalAmount: number;
  shippingCharge: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus: string;
  shippingAddress?: {
    fullAddress?: string;
    locality?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    secondaryPhone?: string;
    alternatePhone?: string;
    phone?: string;
    fullName?: string;
    name?: string;
  };
  user?: {
    username?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    quantity: number;
    price: number;
    product?: {
      name: string;
      code?: string;
      image?: string;
    };
    variant?: {
      options?: Record<string, string>;
    };
  }>;
  coupon?: {
    code: string;
  };
  invoicePrinted?: boolean;
  invoicePrintedAt?: string | null;
}

interface CompanySettings {
  COMPANY_NAME?: string;
  COMPANY_TAGLINE?: string;
  COMPANY_LOGO?: string;
  INVOICE_FORMAT?: "A4" | "THERMAL";
}

interface BulkInvoiceModalProps {
  orderIds?: string[];
  unprintedOnly?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}


export default function BulkInvoiceModal({
  orderIds,
  unprintedOnly,
  onClose,
  onSuccess,
}: BulkInvoiceModalProps) {
  const [orders, setOrders] = useState<BulkInvoiceOrder[]>([]);
  const [company, setCompany] = useState<CompanySettings>({});
  const [loading, setLoading] = useState(true);
  const format = "THERMAL";
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [ordersRes, settingsRes] = await Promise.all([
          api.get("/order/bulk-invoices", {
            params: {
              orderIds: orderIds?.length ? orderIds.join(",") : undefined,
              unprintedOnly: unprintedOnly ? "true" : undefined,
              limit: 100,
            },
          }),
          api.get("/admin/company-settings").catch(() => ({ data: { settings: {} } })),
        ]);

        if (mounted) {
          const loadedOrders = ordersRes.data?.orders ?? [];
          setOrders(loadedOrders);
          const s = settingsRes.data?.settings ?? {};
          setCompany(s);
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? "Failed to load orders for invoice printing");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [orderIds, unprintedOnly]);

  const totalValue = orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
  const companyName = company.COMPANY_NAME || "Store";
  const companyTagline = company.COMPANY_TAGLINE || "Official Invoice";

  const fmtCurrency = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatVariant = (variant?: { options?: Record<string, string> } | null) => {
    if (!variant?.options) return "";
    return Object.entries(variant.options)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  };

  // ── Thermal (4″ × 6″) Print Handler ──────────────────────────────────────────
  const handlePrint = () => {
    window.print();
    handleAutoMarkPrinted(true);
  };

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

  // ── Thermal (4″ × 6″) PDF Download Handler ──────────────────────────────────────
  const handleDownloadThermalPdf = () => {
    if (orders.length === 0) return;

    const PAGE_W = 101.6;
    const PAGE_H = 152.4;
    const M = 4;
    const BOX_X = M;
    const BOX_Y = M;
    const BOX_W = PAGE_W - M * 2;
    const BOX_H = PAGE_H - M * 2;

    const doc = new jsPDF({
      unit: "mm",
      format: [PAGE_W, PAGE_H],
      orientation: "portrait",
    });

    orders.forEach((order, orderIdx) => {
      if (orderIdx > 0) {
        doc.addPage([PAGE_W, PAGE_H], "portrait");
      }

      const addr = order.shippingAddress ?? {};
      const customerName = (addr as any)?.fullName || (addr as any)?.name || order.user?.username || "Customer";
      const customerPhone = (addr as any)?.phone || order.user?.phone || "";
      const secondaryPhone = addr?.secondaryPhone || (addr as any)?.alternatePhone || "";
      const phoneNumbers = Array.from(new Set([customerPhone, secondaryPhone].filter(Boolean))).join(", ");
      const fullAddress = addr.fullAddress || (addr as any)?.address || "";

      const addressLines: string[] = [];
      if (fullAddress) {
        fullAddress
          .split(/\n+/)
          .flatMap((part) => part.split(","))
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((item) => {
            addressLines.push(item.toUpperCase());
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
          addressLines.push(formattedLoc.toUpperCase());
        }
      }
      const cityStateZip = [addr.city, addr.state].filter(Boolean).join(", ") + (addr.zipCode ? ` - ${addr.zipCode}` : "");
      if (cityStateZip && !addressLines.some((l) => l.includes(addr.zipCode || "____"))) {
        addressLines.push(cityStateZip.toUpperCase());
      }

      const thermalDate = formatThermalDate(order.createdAt);
      const thermalPaymentMethod = getThermalPaymentMethod(order.paymentMethod);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);

      // Outer Border
      doc.rect(BOX_X, BOX_Y, BOX_W, BOX_H);

      // 1. TO: (Bold Address Section at Top)
      let curY = BOX_Y + 5.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text("TO:", BOX_X + 4, curY);

      curY += 4.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(customerName.toUpperCase(), BOX_X + 4, curY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      addressLines.forEach((line) => {
        curY += 4.5;
        doc.text(line, BOX_X + 4, curY);
      });

      if (phoneNumbers) {
        curY += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`MOB: ${phoneNumbers}`, BOX_X + 4, curY);
      }

      // 2. BOTTOM SECTION (Meta Strip + Table + Charges + Footer Banner anchored to bottom)
      const footerH = 9.5;
      const metaH = 9.5;
      const rowH = 7;
      const headerH = rowH;
      const itemsH = order.items.length * rowH;
      const shippingH = 6;
      const discountH = order.discountAmount > 0 ? 6 : 0;
      const totalH = 7;
      const tableH = headerH + itemsH + shippingH + discountH + totalH;
      const bottomTotalH = metaH + tableH + footerH;

      let bY = BOX_Y + BOX_H - bottomTotalH;

      // Top border of bottom section
      doc.line(BOX_X, bY, BOX_X + BOX_W, bY);

      // ORDER META STRIP
      const metaColW = BOX_W / 3;
      doc.line(BOX_X + metaColW, bY, BOX_X + metaColW, bY + metaH);
      doc.line(BOX_X + metaColW * 2, bY, BOX_X + metaColW * 2, bY + metaH);
      doc.line(BOX_X, bY + metaH, BOX_X + BOX_W, bY + metaH);

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("DATE", BOX_X + metaColW * 0.5, bY + 3.2, { align: "center" });
      doc.text("ORDER NO", BOX_X + metaColW * 1.5, bY + 3.2, { align: "center" });
      doc.text("PAYMENT", BOX_X + metaColW * 2.5, bY + 3.2, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(thermalDate, BOX_X + metaColW * 0.5, bY + 7.5, { align: "center" });
      doc.text(`#${order.id.slice(-8).toUpperCase()}`, BOX_X + metaColW * 1.5, bY + 7.5, { align: "center" });
      doc.text(thermalPaymentMethod, BOX_X + metaColW * 2.5, bY + 7.5, { align: "center" });

      bY += metaH;

      // ITEMS TABLE
      const colItemW = BOX_W * 0.52;
      const colQtyW = BOX_W * 0.24;
      const colPriceW = BOX_W * 0.24;
      const col1X = BOX_X;
      const col2X = BOX_X + colItemW;
      const col3X = col2X + colQtyW;
      const colRightX = BOX_X + BOX_W;

      // Header
      doc.setFillColor(240, 240, 240);
      doc.rect(BOX_X, bY, BOX_W, rowH, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("ITEM", col1X + 3, bY + rowH - 2.2);
      doc.text("QUANTITY", col2X + colQtyW / 2, bY + rowH - 2.2, { align: "center" });
      doc.text("PRICE", colRightX - 3, bY + rowH - 2.2, { align: "right" });

      doc.line(col2X, bY, col2X, bY + rowH);
      doc.line(col3X, bY, col3X, bY + rowH);
      doc.line(BOX_X, bY + rowH, colRightX, bY + rowH);

      bY += rowH;

      // Items
      order.items.forEach((item) => {
        const prevY = bY;
        bY += rowH;
        const itemName = (item.product?.name ?? "Product").toUpperCase();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const splitName = doc.splitTextToSize(itemName, colItemW - 5);
        doc.text(splitName[0] || itemName, col1X + 3, bY - 2.2);

        doc.text(String(item.quantity), col2X + colQtyW / 2, bY - 2.2, { align: "center" });
        doc.text(`Rs. ${Math.round(item.price * item.quantity)}`, colRightX - 3, bY - 2.2, { align: "right" });

        doc.line(col2X, prevY, col2X, bY);
        doc.line(col3X, prevY, col3X, bY);
        doc.line(BOX_X, bY, colRightX, bY);
      });

      // Shipping Charges
      {
        bY += 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("SHIPPING CHARGES", col1X + 3, bY - 1.8);
        const shipText = order.shippingCharge > 0 ? `Rs. ${Math.round(order.shippingCharge)}` : "FREE";
        doc.text(shipText, colRightX - 3, bY - 1.8, { align: "right" });
        doc.line(BOX_X, bY, colRightX, bY);
      }

      // Discount if any
      if (order.discountAmount > 0) {
        bY += 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const discText = `DISCOUNT${order.coupon ? ` (${order.coupon.code})` : ""}`;
        doc.text(discText, col1X + 3, bY - 1.8);
        doc.text(`-Rs. ${Math.round(order.discountAmount)}`, colRightX - 3, bY - 1.8, { align: "right" });
        doc.line(BOX_X, bY, colRightX, bY);
      }

      // Total
      {
        bY += 7;
        doc.setFillColor(245, 245, 245);
        doc.rect(BOX_X, bY - 7, BOX_W, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("TOTAL AMOUNT", col1X + 3, bY - 2.2);
        doc.text(`Rs. ${Math.round(order.finalAmount)}`, colRightX - 3, bY - 2.2, { align: "right" });
        doc.line(BOX_X, bY, colRightX, bY);
      }

      // SOLID BLACK FOOTER BANNER
      doc.setFillColor(0, 0, 0);
      doc.rect(BOX_X, bY, BOX_W, footerH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("THANK YOU FOR YOUR ORDER", PAGE_W / 2, bY + 6.2, { align: "center" });
    });

    const filename = `Shipping-Labels-4x6-Batch-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
    handleAutoMarkPrinted(true);
  };

  // ── Auto-Mark Invoices Printed / Unprinted Handler ─────────────────────────────
  const handleAutoMarkPrinted = async (printed = true) => {
    if (orders.length === 0) return;
    try {
      setMarking(true);
      const orderIdsToMark = orders.map((o) => o.id);
      await api.post("/order/mark-invoices-printed", {
        orderIds: orderIdsToMark,
        printed,
      });
      const now = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          invoicePrinted: printed,
          invoicePrintedAt: printed ? now : null,
        }))
      );
      toast.success(
        printed
          ? `Order confirmation slips dispatched & marked as printed (${orderIdsToMark.length} orders)`
          : `Marked ${orderIdsToMark.length} order(s) as unprinted`
      );
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update print status");
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* ── Screen Modal Box ── */}
      <div className="print:hidden w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Batch Shipping Label Printing
                {!loading && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                    {orders.length} {orders.length === 1 ? "order" : "orders"}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Download or print multiple shipping labels at once without individual page navigation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <ClipLoader color="#4f46e5" size={36} />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Compiling shipping label data…
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-fit mx-auto border border-emerald-100">
                <PackageCheck className="size-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">All shipping labels are up to date!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No unprinted shipping labels found for the selected criteria. When new orders arrive, they will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Labels</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{orders.length}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Value</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">{fmtCurrency(totalValue)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Format</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-900 text-white shadow-xs">
                      Shipping Label
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Queue List Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Shipping labels in this batch ({orders.length})
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Chronological order (oldest to newest)
                  </span>
                </div>
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 max-h-60 overflow-y-auto bg-white">
                  {orders.map((o) => (
                    <div key={o.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-800">
                          #{o.id.slice(-8).toUpperCase()}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {o.user?.username ?? "Customer"}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(o.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-[11px]">
                          {o.items?.length ?? 0} items
                        </span>
                        <span className="font-bold text-slate-900">
                          {fmtCurrency(o.finalAmount)}
                        </span>
                        {o.invoicePrinted ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                            Printed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                            Unprinted
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Batch Print Status Strip with Quick Undo */}
              {orders.length > 0 && orders.some((o) => o.invoicePrinted) && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
                    <p className="text-xs font-semibold text-emerald-900">
                      {orders.every((o) => o.invoicePrinted)
                        ? "All shipping labels in this batch are marked as printed."
                        : `${orders.filter((o) => o.invoicePrinted).length} of ${orders.length} shipping labels marked as printed.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={marking}
                    onClick={() => handleAutoMarkPrinted(false)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition cursor-pointer disabled:opacity-50"
                    title="Revert print status back to unprinted if needed"
                  >
                    Mark All as Unprinted
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>

          {!loading && orders.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold text-xs shadow-xs hover:bg-slate-50 active:scale-98 transition cursor-pointer"
              >
                <Printer className="size-4" />
                Print All ({orders.length})
              </button>
              <button
                type="button"
                onClick={handleDownloadThermalPdf}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs shadow-md hover:bg-slate-800 active:scale-98 transition cursor-pointer"
              >
                <Download className="size-4" />
                Download PDF ({orders.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Print Container (Mounted via Portal directly to body so position:fixed modal never breaks page breaks) ── */}
      {createPortal(
        <div id="bulk-invoice-print-container" className="hidden print:block w-full bg-white">
          {orders.map((order) => {
            const addr = order.shippingAddress ?? {};
            const customerName = (addr as any)?.fullName || (addr as any)?.name || order.user?.username || "Customer";
            const customerPhone = (addr as any)?.phone || order.user?.phone || "";
            const secondaryPhone = addr?.secondaryPhone || (addr as any)?.alternatePhone || "";
            const phoneNumbers = Array.from(new Set([customerPhone, secondaryPhone].filter(Boolean))).join(", ");
            const fullAddress = addr.fullAddress || (addr as any)?.address || "";

            const addressLines: string[] = [];
            if (fullAddress) {
              fullAddress
                .split(/\n+/)
                .flatMap((part) => part.split(","))
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((item) => {
                  addressLines.push(item.toUpperCase());
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
                addressLines.push(formattedLoc.toUpperCase());
              }
            }
            const cityStateZip = [addr.city, addr.state].filter(Boolean).join(", ") + (addr.zipCode ? ` - ${addr.zipCode}` : "");
            if (cityStateZip && !addressLines.some((l) => l.includes(addr.zipCode || "____"))) {
              addressLines.push(cityStateZip.toUpperCase());
            }

            const thermalDate = formatThermalDate(order.createdAt);
            const thermalPaymentMethod = getThermalPaymentMethod(order.paymentMethod);

            return (
              <div key={order.id} className="bulk-invoice-sheet bg-white p-[0.12in] box-border">
                <div className="border-[1.5px] border-black flex flex-col justify-between h-full font-sans text-black bg-white">
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
                      {/* Table Header: ITEM | QUANTITY | PRICE */}
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

                      {/* Items Rows */}
                      {order.items.map((item: any, idx: number) => {
                        const originalPrice = getItemOriginalPrice(item);
                        const hasSavings = originalPrice && originalPrice > item.price;

                        return (
                          <div key={idx} className="flex border-b border-black text-xs text-black last:border-b-0">
                            <div className="w-[52%] px-2.5 py-1.5 border-r-[1.5px] border-black text-left">
                              <p className="font-bold text-[11px] uppercase leading-tight">
                                {item.product?.name ?? "Product Unavailable"}
                              </p>
                              {formatVariant(item.variant) && (
                                <p className="text-[9.5px] font-medium text-gray-600 mt-0.5">
                                  {formatVariant(item.variant)}
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
                      {/* Shipping */}
                      <div className="flex justify-between border-b border-black px-3 py-1 font-bold text-black">
                        <span className="text-[10px] uppercase text-gray-700">SHIPPING CHARGES</span>
                        <span className="text-[11px] tabular-nums font-mono">
                          {order.shippingCharge > 0 ? `₹${Math.round(order.shippingCharge)}` : "FREE"}
                        </span>
                      </div>

                      {/* Discount if any */}
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

                      {/* Grand Total */}
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
            );
          })}
        </div>,
        document.body
      )}

      {/* ── Global Print Styles ── */}
      <style>{`
        @page {
          size: 4in 6in;
          margin: 0mm !important;
        }
        @media print {
          /* Hide everything on document body except the portal print container */
          body > *:not(#bulk-invoice-print-container) {
            display: none !important;
          }
          #root {
            display: none !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 4in !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          #bulk-invoice-print-container {
            display: block !important;
            position: static !important;
            width: 4in !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bulk-invoice-sheet {
            display: block !important;
            width: 4in !important;
            max-width: 4in !important;
            min-height: 5.9in !important;
            height: 5.95in !important;
            max-height: 6in !important;
            box-sizing: border-box !important;
            padding: 0.12in !important;
            background: #ffffff !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .bulk-invoice-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          #bulk-invoice-print-container, #bulk-invoice-print-container * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
