import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { domainUrl } from "../utils/constant";
import api from "../utils/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Loader2,
  ShieldCheck,
  Truck,
  CheckCircle2,
} from "lucide-react";
import Loader from "../components/Loader";

interface CartItemType {
  _id?: string;
  productId: string;
  variantId?: string | null;
  name: string;
  price: number;
  quantity: number;
  stock?: number;
  image?: string;
  selectedOptions?: Record<string, string>;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);

// ── Loading skeleton matching Panakkal style ──────────────────────────────────
const RowSkeleton = () => (
  <div className="flex items-center gap-4 bg-white/70 border border-[#E6DFD5] rounded-xl p-4 animate-pulse">
    <div className="w-16 h-16 rounded-lg bg-[#EAE4D9] shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-1/3 bg-[#EAE4D9] rounded" />
      <div className="h-3 w-1/5 bg-[#EAE4D9] rounded" />
    </div>
    <div className="h-9 w-24 bg-[#EAE4D9] rounded-lg" />
    <div className="h-4 w-16 bg-[#EAE4D9] rounded" />
  </div>
);

function CartPage() {
  const navigate = useNavigate();
  const {
    cartItems,
    loading,
    error,
    removeFromCart,
    updateQuantity,
    cartTotal,
    clearCart,
    fetchCart,
  } = useCart();

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Stock Validation Logic
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) return;

    cartItems.forEach((item) => {
      const stock = item.stock ?? 0;
      if (stock > 0 && item.quantity > stock) {
        updateQuantity(item.productId, stock, item.variantId);
        toast(`${item.name} quantity adjusted to available stock (${stock})`, {
          id: "stock-change",
        });
      }
    });
  }, [cartItems, updateQuantity]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const getImageUrl = (path: string | undefined) => {
    if (!path) return "https://via.placeholder.com/100?text=Oil";
    return path.startsWith("http") ? path : `${domainUrl}/${path}`;
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleIncrement = (item: CartItemType) => {
    const stock = item.stock ?? 0;
    if (stock > 0 && item.quantity >= stock) {
      toast.error(`Only ${stock} bottle(s) available in stock`, {
        id: "limited-stock",
      });
      return;
    }
    updateQuantity(item.productId, item.quantity + 1, item.variantId);
  };

  const handleDecrement = (item: CartItemType) => {
    if (item.quantity > 1) {
      updateQuantity(item.productId, item.quantity - 1, item.variantId);
    }
  };

  const handleRemoveItem = (item: CartItemType) => {
    removeFromCart(item.productId, item.variantId);
    toast(`${item.name} removed from cart`, {
      id: "removed-item",
    });
  };

  const handleCheckoutClick = async () => {
    try {
      setCheckoutLoading(true);
      const res = await api.post("/order/pre-checkout");
      if (res.data?.message && res.data.message !== "Proceed to address selection") {
        toast(res.data.message);
      }
      navigate("/checkout");
    } catch (err) {
      const _e = err as any;
      toast.error(_e.response?.data?.message || "Checkout failed", {
        id: "checkout-error",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const hasOutOfStockItem = cartItems.some((item) => (item.stock ?? 0) === 0);
  const cartTotalNum = Number(cartTotal) || 0;

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F2] text-[#B91C1C] font-body p-6 pt-36">
        <div className="bg-white p-8 rounded-2xl border border-[#E6DFD5] shadow-sm text-center max-w-md">
          <p className="font-semibold text-lg mb-4">{error}</p>
          <button
            onClick={() => fetchCart()}
            className="px-6 py-2.5 bg-[#0B6B6B] text-white rounded-xl font-bold hover:bg-[#084F4F] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && cartItems.length === 0) {
    return (
      <Loader
        fullScreen={false}
        message="Loading your cart..."
        className="pt-36 min-h-screen"
      />
    );
  }

  // Empty state
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F2] p-6 pt-36 font-body">
        <div className="bg-white border border-[#E6DFD5] p-10 sm:p-14 rounded-3xl shadow-xs text-center max-w-md w-full">
          <div className="w-18 h-18 rounded-full bg-[#DDEDEA] flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-9 h-9 text-[#0B6B6B]" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#172B2A] mb-3">
            Your Cart is Empty
          </h1>
          <p className="text-[#34504D] mb-8 text-base leading-relaxed">
            You have not added any products yet. Browse our Ayurvedic preparations for natural vertigo and ear balance relief.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full h-14 bg-[#0B6B6B] hover:bg-[#084F4F] text-white rounded-xl font-bold text-base transition-colors shadow-sm"
          >
            Explore Bhramananthu Oil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F2] font-body text-[#172B2A] px-4 sm:px-8 lg:px-12 pb-16 pt-[calc(var(--app-header-h,120px)+28px)]">
      <div className="max-w-[1400px] mx-auto">
        {/* Navigation Breadcrumb / Top Row */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={handleGoBack}
              className="p-2.5 rounded-xl bg-white border border-[#E6DFD5] text-[#172B2A] hover:bg-[#F1E9DA] hover:text-[#0B6B6B] transition-colors group shrink-0 shadow-2xs"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#172B2A] leading-tight">
                My Shopping Cart
              </h1>
              <p className="text-sm text-[#34504D] mt-0.5">
                {cartItems.length} {cartItems.length === 1 ? "item" : "items"} selected
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="hidden sm:inline-flex items-center text-sm font-semibold text-[#0B6B6B] hover:underline"
          >
            ← Continue shopping
          </Link>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Cart Items List */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E6DFD5] p-5 sm:p-7 shadow-xs">
            <div className="flex justify-between items-center pb-4 mb-5 border-b border-[#E6DFD5]">
              <h2 className="font-heading text-xl font-bold text-[#172B2A]">
                Items in Cart
              </h2>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[#B91C1C] hover:text-red-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Clear all
                </button>
              )}
            </div>

            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-12 text-xs font-bold text-[#34504D] uppercase tracking-wider pb-3 mb-3 border-b border-[#F1E9DA]">
              <div className="col-span-6">Product Details</div>
              <div className="col-span-3 text-center">Quantity</div>
              <div className="col-span-3 text-right">Price</div>
            </div>

            {/* Cart Items List */}
            <div className="space-y-4">
              {loading && cartItems.length === 0 ? (
                Array.from({ length: 2 }).map((_, i) => <RowSkeleton key={i} />)
              ) : (
                cartItems.map((item) => {
                  const stock = item.stock ?? 0;
                  return (
                    <div
                      key={item._id || `${item.productId}-${item.variantId ?? ""}`}
                      className="grid grid-cols-12 gap-y-4 md:gap-y-0 items-center p-4 sm:p-5 rounded-xl bg-[#FAF8F2] border border-[#E6DFD5] transition-colors"
                    >
                      {/* Product Thumbnail & Details */}
                      <div className="col-span-12 md:col-span-6 flex items-center gap-4">
                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-white border border-[#E6DFD5] flex items-center justify-center p-2 overflow-hidden shrink-0 shadow-2xs">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/products/${item.productId}`}
                            className="font-heading font-bold text-[#172B2A] text-base sm:text-lg hover:text-[#0B6B6B] transition-colors block truncate"
                          >
                            {item.name}
                          </Link>
                          {item.selectedOptions &&
                            Object.keys(item.selectedOptions).length > 0 && (
                              <p className="text-xs sm:text-sm text-[#34504D] font-medium mt-0.5">
                                {Object.entries(item.selectedOptions)
                                  .map(([axis, value]) => `${axis}: ${value}`)
                                  .join(" · ")}
                              </p>
                            )}
                          <div className="flex items-center gap-2 mt-1.5">
                            {stock > 5 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B6B6B] bg-[#DDEDEA] px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3" /> In stock
                              </span>
                            ) : stock > 0 ? (
                              <span className="text-xs font-semibold text-[#D97706] bg-amber-50 px-2 py-0.5 rounded-md">
                                Only {stock} left
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                Out of stock
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="col-span-6 md:col-span-3 flex justify-start md:justify-center items-center">
                        <div className="inline-flex items-center bg-white border-[1.5px] border-[#0B6B6B] rounded-lg overflow-hidden shadow-2xs">
                          <button
                            onClick={() => handleDecrement(item)}
                            className="w-9 h-9 flex items-center justify-center text-[#172B2A] hover:bg-[#DDEDEA] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-[#172B2A] font-bold text-base w-10 text-center select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleIncrement(item)}
                            className="w-9 h-9 flex items-center justify-center text-[#172B2A] hover:bg-[#DDEDEA] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            disabled={stock > 0 && item.quantity >= stock}
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Price & Remove Button */}
                      <div className="col-span-6 md:col-span-3 flex justify-end items-center gap-4">
                        <div className="text-right">
                          <span className="font-heading font-extrabold text-[#172B2A] text-lg sm:text-xl block">
                            {fmt(item.price * item.quantity)}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-xs text-[#34504D]">
                              {fmt(item.price)} each
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="p-2 rounded-lg text-[#34504D] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
                          aria-label={`Remove ${item.name}`}
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Note on directions */}
            <div className="mt-6 p-4 rounded-xl bg-[#F1E9DA] border border-[#E6DFD5] flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0B6B6B] shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-[#34504D] leading-relaxed">
                <strong className="text-[#172B2A]">100% Genuine Ayurvedic Product:</strong> Formulated according to classical Tailapaka Vidhi at Panakkal Ayurveda Pharmacy, Thrissur, Kerala.
              </p>
            </div>
          </div>

          {/* Right Column: Order Summary Sidebar */}
          <div className="lg:col-span-4 bg-[#F1E9DA] rounded-2xl border border-[#E6DFD5] p-6 sm:p-7 shadow-xs sticky top-[calc(var(--app-header-h,120px)+20px)]">
            <h2 className="font-heading text-xl font-bold text-[#172B2A] pb-3 mb-4 border-b border-[#E6DFD5]">
              Order Summary
            </h2>

            {loading && cartItems.length === 0 ? (
              <div className="space-y-3 mb-6 animate-pulse">
                <div className="h-4 w-full bg-[#EAE4D9] rounded" />
                <div className="h-4 w-2/3 bg-[#EAE4D9] rounded" />
              </div>
            ) : (
              <div className="space-y-3 mb-6 text-sm sm:text-base">
                <div className="flex justify-between text-[#34504D]">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-[#172B2A]">{fmt(cartTotalNum)}</span>
                </div>
                <div className="flex justify-between text-[#34504D]">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#0B6B6B]" />
                    Delivery Charges
                  </span>
                  <span className="font-bold text-[#0B6B6B] uppercase text-xs sm:text-sm bg-[#DDEDEA] px-2 py-0.5 rounded">
                    Free Delivery
                  </span>
                </div>
                <div className="pt-4 border-t border-[#E6DFD5] flex justify-between items-baseline">
                  <div>
                    <span className="font-heading text-lg font-bold text-[#172B2A]">
                      Total Payable
                    </span>
                    <p className="text-xs text-[#34504D]">Inclusive of all taxes</p>
                  </div>
                  <span className="font-heading text-2xl font-black text-[#172B2A]">
                    {fmt(cartTotalNum)}
                  </span>
                </div>
              </div>
            )}

            {/* Checkout Action Button - 56px Tall for Easy Clicking */}
            <button
              onClick={handleCheckoutClick}
              disabled={
                checkoutLoading ||
                loading ||
                cartItems.length === 0 ||
                hasOutOfStockItem
              }
              className="w-full h-14 bg-[#0B6B6B] hover:bg-[#084F4F] text-white rounded-xl font-bold text-base sm:text-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 cursor-pointer"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : hasOutOfStockItem ? (
                "Remove Out of Stock Items"
              ) : (
                `Continue to Checkout · ${fmt(cartTotalNum)}`
              )}
            </button>

            {/* Trust and Payment Perks */}
            <div className="mt-6 pt-5 border-t border-[#E6DFD5] space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#34504D]">
                <ShieldCheck className="w-4 h-4 text-[#0B6B6B] shrink-0" />
                <span>Cash on delivery & online payment available</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#34504D]">
                <Truck className="w-4 h-4 text-[#0B6B6B] shrink-0" />
                <span>Direct dispatch from Panakkal Pharmacy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
