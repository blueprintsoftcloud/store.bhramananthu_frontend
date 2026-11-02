import { Fragment, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { motion, Variants } from "framer-motion";
import {
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowLeft,
  Banknote,
  Wifi,
  Truck,
  Receipt,
  ShoppingBag,
  QrCode,
  RotateCcw,
} from "lucide-react";
// ── Types ────────────────────────────────────────────────────────────────────

interface TransactionItem {
  product: { id: string; name: string; image: string } | null;
  quantity: number;
  price: number;
}

interface Transaction {
  id: string;
  createdAt: string;
  paymentMethod: "ONLINE" | "POD" | "CASH" | "QR";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  orderStatus: string;
  totalAmount: number;
  shippingCharge: number;
  discountAmount: number;
  finalAmount: number;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  coupon: { code: string } | null;
  items: TransactionItem[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAYMENT_STATUS_CFG: Record<string, { cls: string; icon: React.ReactElement }> = {
  PAID: { cls: "bg-[#DDEDEA] text-[#0B6B6B] border-[#D0E5E0]", icon: <CheckCircle className="w-3.5 h-3.5 text-[#0B6B6B]" /> },
  PENDING: { cls: "bg-amber-50 text-amber-700 border-amber-200/80", icon: <Clock className="w-3.5 h-3.5 text-amber-600" /> },
  FAILED: { cls: "bg-rose-50 text-rose-600 border-rose-200/80", icon: <XCircle className="w-3.5 h-3.5 text-rose-500" /> },
  REFUNDED: { cls: "bg-purple-50 text-purple-700 border-purple-200/80", icon: <CreditCard className="w-3.5 h-3.5 text-purple-600" /> },
};

const PaymentStatusBadge = ({
  status,
  orderStatus,
  paymentMethod,
}: {
  status: string;
  orderStatus?: string;
  paymentMethod?: string;
}) => {
  const isCod = paymentMethod === "POD" || paymentMethod === "COD" || paymentMethod === "CASH";

  if (orderStatus === "CANCELLED" && status === "PENDING" && isCod) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs bg-[#FAF8F2] text-[#4A5554] border-[#E4DCCE]">
        <XCircle className="w-3.5 h-3.5 text-[#8C9896]" /> No Payment Made
      </span>
    );
  }
  const { cls, icon } = PAYMENT_STATUS_CFG[status] ?? PAYMENT_STATUS_CFG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs ${cls}`}>
      {icon} {status}
    </span>
  );
};

const ORDER_STATUS_CFG: Record<string, { cls: string; icon: React.ReactElement; label: string }> = {
  PROCESSING: { cls: "bg-amber-50 text-amber-700 border-amber-200/80", icon: <Clock className="w-3.5 h-3.5 text-amber-600" />, label: "Processing" },
  CONFIRMED: { cls: "bg-[#DDEDEA] text-[#0B6B6B] border-[#D0E5E0]", icon: <CheckCircle className="w-3.5 h-3.5 text-[#0B6B6B]" />, label: "Confirmed" },
  SHIPPED: { cls: "bg-sky-50 text-sky-700 border-sky-200/80", icon: <Truck className="w-3.5 h-3.5 text-sky-600" />, label: "Shipped" },
  DELIVERED: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80", icon: <Package className="w-3.5 h-3.5 text-emerald-600" />, label: "Delivered" },
  CANCELLED: { cls: "bg-rose-50 text-rose-700 border-rose-200/80", icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />, label: "Cancelled" },
  RETURNED: { cls: "bg-purple-50 text-purple-700 border-purple-200/80", icon: <RotateCcw className="w-3.5 h-3.5 text-purple-600" />, label: "Returned" },
};

const OrderStatusBadge = ({ status }: { status: string }) => {
  const cfg = ORDER_STATUS_CFG[status] ?? { cls: "bg-[#FAF8F2] text-[#4A5554] border-[#E4DCCE]", icon: <Package className="w-3.5 h-3.5 text-[#4A5554]" />, label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const PAYMENT_METHOD_CFG: Record<string, { label: string; icon: React.ReactElement }> = {
  ONLINE: { label: "Online", icon: <Wifi className="w-3.5 h-3.5 text-[#0B6B6B]" /> },
  QR: { label: "Pay with QR", icon: <QrCode className="w-3.5 h-3.5 text-[#0B6B6B]" /> },
  POD: { label: "Cash on Delivery", icon: <Banknote className="w-3.5 h-3.5 text-[#0B6B6B]" /> },
  CASH: { label: "Prepaid", icon: <Banknote className="w-3.5 h-3.5 text-[#0B6B6B]" /> },
};

const PaymentMethodBadge = ({ method }: { method: string }) => {
  const cfg = PAYMENT_METHOD_CFG[method] ?? PAYMENT_METHOD_CFG.POD;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-white text-[#172B2A] border-[#E4DCCE] shadow-2xs">
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ── Animations ────────────────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

const CardSkeleton = () => (
  <div className="rounded-3xl border border-[#E6DFD5] bg-white px-6 py-5 animate-pulse shadow-xs">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FAF8F2] border border-[#E4DCCE]" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-14 bg-[#FAF8F2] rounded" />
              <div className="h-3.5 w-20 bg-[#FAF8F2] rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-7 w-20 bg-[#FAF8F2] rounded-full" />
        <div className="h-7 w-24 bg-[#FAF8F2] rounded-full" />
      </div>
    </div>
  </div>
);

// ── Expanded detail panel — shared between the desktop table row and mobile card ──

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

const TransactionDetails = ({
  tx,
  onViewInvoice,
}: {
  tx: Transaction;
  onViewInvoice: () => void;
}) => (
  <div className="space-y-6">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A5554] mb-3">
        Items Summary
      </p>
      <div className="divide-y divide-[#E6DFD5] bg-[#FAF8F2] rounded-2xl border border-[#E6DFD5] px-5">
        {tx.items.map((it, idx) => (
          <div key={idx} className="flex items-center py-4 gap-4">
            {it.product?.image ? (
              <img
                src={it.product.image}
                alt={it.product.name}
                className="w-14 h-14 rounded-xl object-cover bg-white border border-[#E6DFD5] shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white border border-[#E6DFD5] flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-[#8C9896]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-serif font-bold text-[#172B2A] truncate">
                {it.product?.name ?? "Product Unavailable"}
              </p>
              <p className="text-xs text-[#4A5554] font-medium">
                Qty {it.quantity} × {fmt(it.price)}
              </p>
            </div>
            <p className="text-sm font-serif font-bold text-[#172B2A] tabular-nums shrink-0">
              {fmt(it.quantity * it.price)}
            </p>
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A5554] mb-3">
          Payment Breakdown
        </p>
        <div className="bg-white rounded-2xl border border-[#E6DFD5] p-5 space-y-3 text-sm shadow-2xs">
          <div className="flex justify-between">
            <span className="text-[#4A5554] font-medium">Subtotal</span>
            <span className="font-semibold text-[#172B2A] tabular-nums">{fmt(tx.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4A5554] font-medium">Shipping Charge</span>
            <span className="font-semibold text-[#172B2A] tabular-nums">
              {tx.shippingCharge === 0 ? (
                <span className="text-[#0B6B6B] font-bold uppercase text-xs tracking-wide">Free</span>
              ) : (
                fmt(tx.shippingCharge)
              )}
            </span>
          </div>
          {tx.discountAmount > 0 && (
            <div className="flex justify-between text-[#0B6B6B] font-medium">
              <span className="inline-flex items-center gap-1.5">
                Coupon applied
                {tx.coupon?.code && (
                  <span className="font-mono text-xs font-bold bg-[#DDEDEA] text-[#0B6B6B] px-2 py-0.5 rounded-md border border-[#D0E5E0]">
                    {tx.coupon.code}
                  </span>
                )}
              </span>
              <span className="font-bold tabular-nums">-{fmt(tx.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#E6DFD5] pt-3 font-serif font-bold text-base text-[#172B2A]">
            <span>Total Net Paid</span>
            <span className="tabular-nums text-[#0B6B6B]">{fmt(tx.finalAmount)}</span>
          </div>
        </div>
      </div>

      {tx.paymentMethod === "ONLINE" && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A5554] mb-3">
            Payment Reference Gateway
          </p>
          <div className="bg-[#FAF8F2] border border-[#E6DFD5] rounded-2xl p-5 space-y-2.5 text-xs font-mono text-[#4A5554] break-all shadow-inner">
            {tx.razorpayPaymentId && (
              <p className="flex flex-col gap-0.5">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#8C9896]">
                  Gateway Payment ID
                </span>
                <span className="text-[#172B2A] font-medium">{tx.razorpayPaymentId}</span>
              </p>
            )}
            {tx.razorpayOrderId && (
              <p className="flex flex-col gap-0.5 pt-1">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#8C9896]">
                  Razorpay Order Reference
                </span>
                <span className="text-[#172B2A] font-medium">{tx.razorpayOrderId}</span>
              </p>
            )}
            {!tx.razorpayPaymentId && !tx.razorpayOrderId && (
              <p className="font-sans text-[#8C9896] italic">
                No transaction gateway references documented.
              </p>
            )}
          </div>
        </div>
      )}
    </div>

    <button
      onClick={onViewInvoice}
      className="w-full py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-md hover:shadow-lg transition-all text-center bg-[#0B6B6B] hover:bg-[#084E4E] text-white cursor-pointer"
    >
      View Order Confirmation Slip
    </button>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

export default function TransactionHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/order/my-transactions?page=${p}&limit=10`);
      setTransactions(res.data.transactions ?? []);
      setPagination(res.data.pagination ?? null);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(page);
  }, [page, fetchTransactions]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="relative bg-[#FAF8F2] min-h-screen pb-24 pt-[calc(var(--app-header-h,120px)+2rem)] font-sans text-[#172B2A] overflow-x-hidden">
      {/* Decorative background blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#DDEDEA]/40 via-[#FAF8F2]/60 to-transparent pointer-events-none -z-10 blur-2xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-xl bg-white border border-[#E6DFD5] text-[#172B2A] hover:bg-[#F1E9DA] hover:text-[#0B6B6B] transition-colors group shrink-0 shadow-2xs cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#172B2A] leading-tight">
                Transaction History
              </h1>
              {!loading && pagination && (
                <p className="text-sm text-[#34504D] mt-0.5">
                  {pagination.total} {pagination.total === 1 ? "transaction" : "transactions"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 px-4 bg-white rounded-3xl border border-[#E6DFD5] shadow-xs max-w-2xl mx-auto"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-[#DDEDEA] text-[#0B6B6B] border border-[#D0E5E0]">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#172B2A] tracking-tight">
              No Transactions Yet
            </h3>
            <p className="mt-2 text-sm text-[#4A5554] max-w-xs mx-auto">
              Your billing and payment histories will settle here once an order has been initiated.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-6 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest bg-[#0B6B6B] hover:bg-[#084E4E] text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Start Shopping
            </button>
          </motion.div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Desktop: real table */}
              <div className="hidden md:block bg-white rounded-3xl border border-[#E6DFD5] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#FAF8F2] border-b border-[#E6DFD5]">
                      <tr>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#4A5554]">Date</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#4A5554]">Order ID</th>
                        <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-widest text-[#4A5554]">Amount</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#4A5554]">Order</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#4A5554]">Payment</th>
                        <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#4A5554]">Method</th>
                        <th className="px-5 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6DFD5]">
                      {transactions.map((tx) => {
                        const isOpen = expanded === tx.id;
                        return (
                          <Fragment key={tx.id}>
                            <tr
                              className="cursor-pointer select-none hover:bg-[#FAF8F2]/60 transition-colors"
                              onClick={() => setExpanded(isOpen ? null : tx.id)}
                            >
                              <td className="px-5 py-4 whitespace-nowrap text-[#4A5554] font-medium">{fmtDate(tx.createdAt)}</td>
                              <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-[#4A5554]">
                                #{tx.id.slice(-8).toUpperCase()}
                              </td>
                              <td className="px-5 py-4 text-right font-serif font-bold text-[#172B2A] tabular-nums whitespace-nowrap">
                                {fmt(tx.finalAmount)}
                              </td>
                              <td className="px-5 py-4"><OrderStatusBadge status={tx.orderStatus} /></td>
                              <td className="px-5 py-4"><PaymentStatusBadge status={tx.paymentStatus} orderStatus={tx.orderStatus} paymentMethod={tx.paymentMethod} /></td>
                              <td className="px-5 py-4"><PaymentMethodBadge method={tx.paymentMethod} /></td>
                              <td className="px-5 py-4 text-center">
                                {isOpen ? (
                                  <ChevronUp className="w-4 h-4 text-[#0B6B6B] mx-auto" strokeWidth={2.5} />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-[#8C9896] mx-auto" strokeWidth={2.5} />
                                )}
                              </td>
                            </tr>
                            {isOpen && (
                              <tr>
                                <td colSpan={7} className="bg-[#FAF8F2]/40 px-6 py-7 border-t border-[#E6DFD5]">
                                  <TransactionDetails tx={tx} onViewInvoice={() => navigate(`/invoice/${tx.id}`)} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: compact stacked cards */}
              <div className="md:hidden space-y-4">
                {transactions.map((tx) => {
                  const isOpen = expanded === tx.id;
                  return (
                    <motion.div
                      key={tx.id}
                      variants={itemVariants}
                      className="bg-white rounded-3xl border border-[#E6DFD5] shadow-xs overflow-hidden"
                    >
                      <div
                        className="p-4 sm:p-5 cursor-pointer select-none"
                        onClick={() => setExpanded(isOpen ? null : tx.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-[#4A5554] font-medium">{fmtDate(tx.createdAt)}</p>
                            <p className="text-xs font-mono text-[#8C9896] mt-0.5">#{tx.id.slice(-8).toUpperCase()}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="text-base font-serif font-bold text-[#172B2A] tabular-nums">{fmt(tx.finalAmount)}</p>
                            <ChevronDown
                              className={`w-4 h-4 text-[#8C9896] transition-transform duration-300 ${isOpen ? "rotate-180 text-[#0B6B6B]" : ""}`}
                              strokeWidth={2.5}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <OrderStatusBadge status={tx.orderStatus} />
                          <PaymentStatusBadge status={tx.paymentStatus} orderStatus={tx.orderStatus} paymentMethod={tx.paymentMethod} />
                          <PaymentMethodBadge method={tx.paymentMethod} />
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-[#E6DFD5] bg-[#FAF8F2]/40 px-4 py-6">
                          <TransactionDetails tx={tx} onViewInvoice={() => navigate(`/invoice/${tx.id}`)} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-3 rounded-2xl border border-[#E4DCCE] bg-white text-[#172B2A] hover:bg-[#FAF8F2] shadow-2xs disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <span className="text-xs font-bold uppercase tracking-widest text-[#4A5554]">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="p-3 rounded-2xl border border-[#E4DCCE] bg-white text-[#172B2A] hover:bg-[#FAF8F2] shadow-2xs disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
