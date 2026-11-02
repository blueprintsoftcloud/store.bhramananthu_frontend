import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import { motion, Variants } from "framer-motion";
import {
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ArrowLeft,
  ShoppingBag,
  Package,
  FileText,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface OrderProduct {
  id: string;
  name: string;
  image: string;
}

interface OrderItem {
  product: OrderProduct | null;
  quantity: number;
  price: number;
  /** e.g. { Storage: "128GB", Color: "Black" } — the specific option this line item
   * was purchased in, if the product has variants (see mongoose.ts's ProductVariant).
   * null/absent for a plain single-SKU product. */
  variant?: { options: Record<string, string> } | null;
}

interface Order {
  id: string;
  createdAt: string;
  totalAmount: number;
  discountAmount: number;
  shippingCharge: number;
  finalAmount: number;
  orderStatus: string;
  deliveryPartnerName?: string;
  trackingId?: string;
  trackingLink?: string;
  shippingNote?: string;
  shippedAt?: string;
  items: OrderItem[];
}

// --- HELPER: Status Badge ---
const STATUS_CFG: Record<string, { cls: string; icon: React.ReactElement }> = {
  Processing: { cls: "bg-amber-50 text-amber-700 border-amber-200/80", icon: <Clock className="w-3.5 h-3.5 text-amber-600" /> },
  Confirmed: { cls: "bg-[#DDEDEA] text-[#0B6B6B] border-[#D0E5E0]", icon: <Clock className="w-3.5 h-3.5 text-[#0B6B6B]" /> },
  Shipped: { cls: "bg-sky-50 text-sky-700 border-sky-200/80", icon: <Truck className="w-3.5 h-3.5 text-sky-600" /> },
  Delivered: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80", icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> },
  Cancelled: { cls: "bg-rose-50 text-rose-600 border-rose-200/80", icon: <XCircle className="w-3.5 h-3.5 text-rose-500" /> },
  Returned: { cls: "bg-purple-50 text-purple-700 border-purple-200/80", icon: <RotateCcw className="w-3.5 h-3.5 text-purple-600" /> },
};

const StatusBadge = ({ rawStatus }: { rawStatus: string }) => {
  // Normalise to title-case so "SHIPPED" and "Shipped" both match
  const status = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
  const cfg = STATUS_CFG[status] ?? { cls: "bg-[#FAF8F2] text-[#4A5554] border-[#E4DCCE]", icon: <Package className="w-3.5 h-3.5 text-[#4A5554]" /> };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs ${cfg.cls}`}>
      {cfg.icon} {status}
    </span>
  );
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const formatTrackingUrl = (url: string) =>
  url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

// --- Loading skeleton ---
const OrderSkeleton = () => (
  <div className="rounded-2xl sm:rounded-3xl border border-[#E6DFD5] bg-white overflow-hidden animate-pulse shadow-xs">
    <div className="bg-[#FAF8F2] px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-[#E6DFD5]">
      <div className="space-y-1.5">
        <div className="h-3 w-28 bg-[#E4DCCE] rounded-md" />
        <div className="h-2.5 w-20 bg-[#E4DCCE] rounded-md" />
      </div>
      <div className="h-6 w-20 bg-[#E4DCCE] rounded-full" />
    </div>
    <div className="px-4 py-3.5 sm:px-6 sm:py-5 flex items-center gap-3.5">
      <div className="h-16 w-16 sm:h-20 sm:w-20 bg-[#FAF8F2] border border-[#E6DFD5] rounded-xl sm:rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/2 bg-[#FAF8F2] rounded-md" />
        <div className="h-2.5 w-1/4 bg-[#FAF8F2] rounded-md" />
      </div>
    </div>
  </div>
);

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  // ?orderId= arrives from the notification dropdown (Navbar.tsx) — jump straight to
  // that order instead of leaving the shopper to scroll and find it themselves.
  const [searchParams] = useSearchParams();
  const highlightOrderId = searchParams.get("orderId");
  const highlightedRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const fetchOrders = useCallback(async (pageNumber: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/order/myOrders", {
        params: { page: pageNumber, limit: 10 },
      });
      setOrders(res.data.order || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      const e = err as any;
      console.error("Error fetching orders:", e);
      if (e.response?.status === 401) {
        setError("Please login to view your orders");
      } else {
        setError("Unable to load your order history.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(page);
  }, [fetchOrders, page]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === page) return;
    setPage(newPage);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!highlightOrderId || loading || orders.length === 0) return;
    highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightOrderId, loading, orders.length]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] flex items-center justify-center p-4">
        <div className="text-center p-8 sm:p-10 bg-white rounded-3xl border border-[#E6DFD5] shadow-xs max-w-md w-full">
          <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 border border-rose-100">
            <XCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-serif font-bold text-[#172B2A] mb-2">Access Error</h3>
          <p className="text-sm text-[#4A5554] mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider bg-[#0B6B6B] hover:bg-[#084E4E] text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[#FAF8F2] min-h-screen pb-24 pt-[calc(var(--app-header-h,120px)+2rem)] font-sans text-[#172B2A] overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#DDEDEA]/40 via-[#FAF8F2]/60 to-transparent pointer-events-none -z-10 blur-2xl" />

      <div ref={topRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* --- Header Section --- */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <button
              onClick={() => navigate(-1)}
              className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#E6DFD5] text-[#172B2A] hover:bg-[#F1E9DA] hover:text-[#0B6B6B] transition-colors group shrink-0 shadow-2xs cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h1 className="font-heading text-xl sm:text-3xl font-bold text-[#172B2A] leading-tight">
                Order History
              </h1>
              {!loading && (
                <p className="text-xs sm:text-sm text-[#34504D] mt-0.5">
                  {pagination.total} {pagination.total === 1 ? "order" : "orders"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* --- Content --- */}
        {loading ? (
          <div className="space-y-4 sm:space-y-6">
            {Array.from({ length: 3 }).map((_, i) => <OrderSkeleton key={i} />)}
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 px-4 bg-white rounded-3xl border border-[#E6DFD5] shadow-xs max-w-2xl mx-auto"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 bg-[#DDEDEA] text-[#0B6B6B] border border-[#D0E5E0]">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#172B2A] tracking-tight">
              No Orders Yet
            </h3>
            <p className="mt-2 text-sm text-[#4A5554] max-w-xs mx-auto">
              You haven't placed any orders yet. Discover our collection to get started.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 px-6 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest bg-[#0B6B6B] hover:bg-[#084E4E] text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Start Shopping
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 sm:space-y-6"
          >
            {orders.map((order) => {
              const isHighlighted = order.id === highlightOrderId;
              return (
              <motion.div
                key={order.id}
                ref={isHighlighted ? highlightedRef : undefined}
                variants={itemVariants}
                className={`group bg-white rounded-2xl sm:rounded-3xl border overflow-hidden hover:shadow-md transition-all duration-300 ${
                  isHighlighted
                    ? "border-[#0B6B6B] ring-2 ring-[#0B6B6B]/20 shadow-xs"
                    : "border-[#E6DFD5]"
                }`}
              >
                {/* Card Header (Summary) */}
                <div className="bg-[#FAF8F2] px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E6DFD5] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  <div className="flex items-center justify-between sm:justify-start sm:gap-x-5 gap-y-1 w-full sm:w-auto">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm font-serif font-bold text-[#172B2A]">{fmtDate(order.createdAt)}</span>
                      <span className="text-[10px] sm:text-xs font-mono font-semibold text-[#4A5554] bg-white px-2 py-0.5 rounded-lg sm:rounded-xl border border-[#E4DCCE] shadow-2xs">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm sm:text-base font-serif font-bold text-[#0B6B6B] tabular-nums">
                      {fmt(order.finalAmount ?? order.totalAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t border-[#E6DFD5]/60 sm:border-t-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <StatusBadge rawStatus={order.orderStatus} />
                      {order.discountAmount > 0 && (
                        <span className="text-[10px] sm:text-[11px] text-[#084E4E] font-bold bg-[#DDEDEA] px-2 py-0.5 rounded-full border border-[#D0E5E0]">
                          Saved {fmt(order.discountAmount)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/invoice/${order.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E4DCCE] bg-white hover:bg-[#FAF8F2] text-[#172B2A] hover:text-[#0B6B6B] text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer shrink-0"
                      title="View Order Confirmation Slip"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#0B6B6B]" />
                      Order Confirmation Slip
                    </button>
                  </div>
                </div>

                {/* Shipment Details Bar */}
                {(order.deliveryPartnerName || order.trackingId || order.trackingLink || order.shippingNote) && (
                  <div className="bg-[#FAF8F2]/60 border-b border-[#E6DFD5] px-4 py-2 sm:px-6 sm:py-2.5 flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1 text-[11px] sm:text-xs text-[#4A5554]">
                    <span className="inline-flex items-center gap-1.5 font-bold text-[#172B2A] shrink-0">
                      <Truck className="w-3.5 h-3.5 text-[#0B6B6B]" />
                      Shipment:
                    </span>
                    {order.deliveryPartnerName && (
                      <span className="shrink-0">
                        Courier:{" "}
                        {order.trackingLink ? (
                          <a
                            href={formatTrackingUrl(order.trackingLink)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[#0B6B6B] hover:text-[#084E4E] underline underline-offset-2 inline-flex items-center gap-0.5"
                            title="Open courier link"
                          >
                            {order.deliveryPartnerName}
                            <ExternalLink className="w-3 h-3 inline ml-0.5" />
                          </a>
                        ) : (
                          <strong className="font-semibold text-[#172B2A]">{order.deliveryPartnerName}</strong>
                        )}
                      </span>
                    )}
                    {order.trackingId && (
                      <span className="inline-flex items-center gap-1 shrink-0">
                        Tracking ID:{" "}
                        <strong className="font-mono font-bold text-[#172B2A] bg-white px-2 py-0.5 rounded-lg border border-[#E4DCCE]">
                          {order.trackingId}
                        </strong>
                      </span>
                    )}
                    {order.trackingLink && (
                      <span className="inline-flex items-center gap-1 min-w-0">
                        Courier Link:{" "}
                        <a
                          href={formatTrackingUrl(order.trackingLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#0B6B6B] hover:text-[#084E4E] underline underline-offset-2 inline-flex items-center gap-1"
                          title={order.trackingLink}
                        >
                          <span className="truncate max-w-[170px] sm:max-w-[340px] md:max-w-[480px]">
                            {order.trackingLink}
                          </span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </span>
                    )}
                    {order.shippingNote && (
                      <span className="text-[#8C9896] italic shrink-0">
                        Note: {order.shippingNote}
                      </span>
                    )}
                  </div>
                )}

                {/* Order Items */}
                <div className="px-4 sm:px-6 py-1 sm:py-2 divide-y divide-[#E6DFD5]/70">
                  {order.items.map((item, index) => {
                    const isUnavailable = item.product === null;
                    const productName = isUnavailable
                      ? "Product Unavailable"
                      : item.product!.name;
                    const productImage = isUnavailable
                      ? undefined
                      : item.product!.image;

                    return (
                      <div
                        key={index}
                        className="flex flex-row items-center py-3.5 sm:py-5 gap-3.5 sm:gap-5"
                      >
                        <div className="relative h-16 w-16 sm:h-22 sm:w-22 flex-shrink-0 overflow-hidden rounded-xl sm:rounded-2xl border border-[#E6DFD5] bg-[#FAF8F2] shadow-2xs">
                          {isUnavailable ? (
                            <div className="h-full w-full flex items-center justify-center">
                              <XCircle className="h-6 w-6 text-[#8C9896]" />
                            </div>
                          ) : (
                            <img
                              src={productImage}
                              alt={productName}
                              className="h-full w-full object-cover object-center"
                            />
                          )}
                        </div>

                        <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between w-full text-left gap-1.5 sm:gap-4 min-w-0">
                          <div className="min-w-0">
                            <h4
                              className={`text-sm sm:text-base font-serif font-bold tracking-tight truncate sm:whitespace-normal ${isUnavailable ? "text-[#8C9896] italic" : "text-[#172B2A]"}`}
                            >
                              {productName}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-[#5D6B69]">
                              {item.variant?.options && Object.keys(item.variant.options).length > 0 && (
                                <span className="font-medium">
                                  {Object.entries(item.variant.options)
                                    .map(([axis, value]) => `${axis}: ${value}`)
                                    .join(" · ")}
                                </span>
                              )}
                              {item.variant?.options && Object.keys(item.variant.options).length > 0 && (
                                <span className="text-[#A4B1AF]">•</span>
                              )}
                              <span className="font-semibold text-[#172B2A]">
                                Qty: {item.quantity}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end gap-2 pt-0.5 sm:pt-0">
                            <p className="text-sm sm:text-base font-serif font-bold text-[#172B2A] tabular-nums">
                              {fmt(item.price * item.quantity)}
                            </p>

                            {!isUnavailable && (
                              <button
                                onClick={() => navigate(`/products/${item.product!.id}`)}
                                className="text-xs font-bold uppercase tracking-wider text-[#0B6B6B] hover:text-[#084E4E] hover:underline transition-all cursor-pointer inline-flex items-center gap-0.5"
                              >
                                <span>View Product</span>
                                <ChevronRight className="w-3.5 h-3.5 sm:hidden" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
              );
            })}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-6 border-t border-[#E6DFD5]">
                <p className="text-xs text-[#4A5554] font-medium">
                  Showing <span className="font-bold text-[#172B2A]">{(page - 1) * pagination.limit + 1}</span> to{" "}
                  <span className="font-bold text-[#172B2A]">{Math.min(page * pagination.limit, pagination.total)}</span> of{" "}
                  <span className="font-bold text-[#172B2A]">{pagination.total}</span> orders
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || loading}
                    className="p-2.5 px-3.5 rounded-xl border border-[#E4DCCE] bg-white text-[#172B2A] hover:bg-[#FAF8F2] shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        const hasGap = prev && p - prev > 1;
                        return (
                          <Fragment key={p}>
                            {hasGap && <span className="px-1 text-[#8C9896] text-xs font-mono">…</span>}
                            <button
                              onClick={() => handlePageChange(p)}
                              disabled={loading}
                              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                p === page
                                  ? "bg-[#0B6B6B] text-white shadow-xs"
                                  : "bg-white border border-[#E4DCCE] text-[#172B2A] hover:bg-[#FAF8F2]"
                              }`}
                            >
                              {p}
                            </button>
                          </Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === pagination.totalPages || loading}
                    className="p-2.5 px-3.5 rounded-xl border border-[#E4DCCE] bg-white text-[#172B2A] hover:bg-[#FAF8F2] shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
                    title="Next Page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
