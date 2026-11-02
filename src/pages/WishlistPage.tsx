import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Trash2,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Heart,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";
import { domainUrl } from "../utils/constant";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const BACKEND_BASE_URL = domainUrl.replace(/\/api\/?$/, "");

interface WishlistProduct {
  id?: string;
  _id?: string;
  name?: string;
  brand?: string;
  price?: number;
  image?: string;
  stock?: number;
  variantId?: string | null;
  variantOptions?: Record<string, string> | null;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface WishlistProductCardProps {
  product: WishlistProduct;
  cardVariants: Variants;
}

// ── CUSTOM CONFIRMATION MODAL ─────────────────────────────────────────────────
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmationModalProps) => {
  useBodyScrollLock(isOpen);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-sm border border-[#E6DFD5] text-center"
          >
            <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#172B2A] mb-2">
              Clear Wishlist?
            </h3>
            <p className="text-sm text-[#4A5554] mb-6 leading-relaxed">
              Are you sure you want to remove all items from your wishlist? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-5 py-2.5 rounded-xl text-sm font-bold text-[#172B2A] bg-[#FAF8F2] hover:bg-[#F1E9DA] border border-[#E6DFD5] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20 transition-all cursor-pointer"
              >
                Yes, Clear All
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ── WISHLIST PRODUCT CARD (MODERN FLOATING GLASS STYLE) ───────────────────────
const WishlistProductCard = ({
  product,
  cardVariants,
}: WishlistProductCardProps) => {
  const { toggleWishlist } = useWishlist();
  const { addToCart, cartItems } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const productId = product?.id ?? product?._id;
  if (!product || !productId) return null;

  const name = product?.name || "Product Name Missing";
  const formattedPrice =
    product?.price != null
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(product.price)
      : "N/A";

  const imageUrl = product?.image
    ? product.image.startsWith("http")
      ? product.image
      : `${BACKEND_BASE_URL}/${product.image}`
    : "https://placehold.co/400x500/FAF8F2/34504D?text=No+Image";

  // Check if item is already in cart (matching both productId and variantId)
  const isInCart = cartItems.some((item) => {
    const isSameProduct = String(item.productId) === String(productId);
    const isSameVariant = String(item.variantId ?? "") === String(product.variantId ?? "");
    return isSameProduct && isSameVariant;
  });

  const stock = typeof product.stock === "number" ? product.stock : 10;
  const isOutOfStock = stock <= 0;

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const success = await toggleWishlist(productId, product.variantId);
    if (success) {
      toast.success(`${name} removed from wishlist`, {
        id: "wishlist-item-removed",
      });
    } else {
      toast.error("Could not remove item", { id: "wishlist-remove-failed" });
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isInCart) {
      toast.error("This item is already in your cart", { id: "wishlist-already-in-cart" });
      return;
    }

    if (isOutOfStock) {
      toast.error("This item is currently out of stock", { id: "wishlist-out-of-stock" });
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(productId, {
        quantity: 1,
        variantId: product.variantId ?? undefined,
      });
      toast.success(`Added ${name} to cart`, {
        id: "wishlist-added-cart",
      });
    } catch (err: any) {
      if (err?.message !== "Not authenticated") {
        toast.error(err?.response?.data?.message || "Failed to add to cart");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const productUrl = product.variantId
    ? `/products/${productId}?variantId=${product.variantId}`
    : `/products/${productId}`;

  return (
    <motion.div
      variants={cardVariants}
      className="group relative flex flex-col w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-white border border-[#E6DFD5] shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out select-none"
    >
      {/* Product Image Area */}
      <div className="relative aspect-[4/3] sm:aspect-square w-full bg-[#FAF8F2] overflow-hidden border-b border-[#E6DFD5]/60 flex items-center justify-center">
        <Link to={productUrl} className="w-full h-full flex items-center justify-center p-4 sm:p-5">
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-500 ease-out transform-gpu group-hover:scale-105"
          />
        </Link>

        {/* Floating Top Left: Out of Stock Badge */}
        {isOutOfStock && (
          <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 bg-rose-600/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs">
            <AlertCircle className="w-3 h-3" />
            <span>Out of stock</span>
          </div>
        )}
      </div>

      {/* Product Details Section (Placed cleanly below image) */}
      <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 gap-4 bg-white">
        <div>
          <Link to={productUrl} className="block group/link">
            <h3 className="text-sm sm:text-base font-bold text-[#172B2A] group-hover/link:text-[#0B6B6B] transition-colors leading-snug line-clamp-2">
              {name}
            </h3>

            {product.variantOptions && Object.keys(product.variantOptions).length > 0 ? (
              <span className="truncate text-xs font-medium text-[#4A5554] block mt-1">
                {Object.entries(product.variantOptions)
                  .map(([axis, value]) => `${axis}: ${value}`)
                  .join(" · ")}
              </span>
            ) : (
              <span className="text-xs font-medium text-[#4A5554] block mt-1">
                Ayurvedic Formulation
              </span>
            )}
          </Link>
        </div>

        {/* Price & Action Row with Delete Button at Bottom */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F1E9DA]">
          <span className="font-serif font-extrabold text-[#172B2A] text-base sm:text-lg">
            {formattedPrice}
          </span>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-2">
            {/* Delete / Trash Button at bottom */}
            <button
              type="button"
              onClick={handleRemove}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF8F2] text-[#4A5554] border border-[#E6DFD5] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all active:scale-95 cursor-pointer group/btn shrink-0"
              title="Remove from Wishlist"
              aria-label={`Remove ${name} from Wishlist`}
            >
              <Trash2 className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
            </button>

            {isInCart ? (
              <div
                className="flex h-9 px-3 items-center justify-center gap-1.5 rounded-xl bg-[#DDEDEA] text-[#0B6B6B] border border-[#D0E5E0] text-xs font-bold select-none"
                title="Already in cart"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>In Cart</span>
              </div>
            ) : isOutOfStock ? (
              <div
                className="flex h-9 px-3 items-center justify-center rounded-xl bg-gray-100 text-gray-400 text-xs font-bold border border-gray-200 select-none cursor-not-allowed"
              >
                <span>Sold Out</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding}
                className="flex h-9 px-3.5 items-center justify-center gap-1.5 rounded-xl bg-[#0B6B6B] hover:bg-[#084F4F] active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-75"
                title="Add to Cart"
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShoppingBag className="w-3.5 h-3.5" />
                )}
                <span>Add to Cart</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── LOADING SKELETON ──────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="flex flex-col w-full rounded-2xl sm:rounded-3xl bg-white border border-[#E6DFD5] animate-pulse shadow-xs overflow-hidden"
      >
        <div className="aspect-[4/3] sm:aspect-square w-full bg-[#FAF8F2] border-b border-[#E6DFD5]/60" />
        <div className="p-4 sm:p-5 space-y-3">
          <div className="h-4 bg-[#EAE4D9] rounded w-3/4" />
          <div className="h-3 bg-[#EAE4D9] rounded w-1/2" />
          <div className="flex items-center justify-between pt-2">
            <div className="h-5 bg-[#EAE4D9] rounded w-1/4" />
            <div className="flex gap-2">
              <div className="h-9 w-9 bg-[#EAE4D9] rounded-xl" />
              <div className="h-9 w-24 bg-[#EAE4D9] rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ── MAIN WISHLIST PAGE ────────────────────────────────────────────────────────
const WishlistPage = () => {
  const navigate = useNavigate();
  const {
    wishlistItems,
    loading,
    wishlistCount,
    clearWishlist,
  } = useWishlist();

  const [isClearModalOpen, setClearModalOpen] = useState(false);

  const handleClearConfirm = async () => {
    const success = await clearWishlist();
    setClearModalOpen(false);
    if (success) {
      toast.success("Wishlist cleared successfully", {
        id: "wishlist-cleared",
      });
    } else {
      toast.error("Failed to clear wishlist", { id: "wishlist-clear-fail" });
    }
  };

  // --- Animation Variants ---
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const cardVariants: Variants = {
    hidden: { y: 16, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.35, ease: "easeOut" as const },
    },
  };

  return (
    <div className="relative bg-[#FAF8F2] min-h-screen pb-24 pt-[calc(var(--app-header-h,120px)+28px)] font-body text-[#172B2A] overflow-x-hidden">
      {/* Custom Confirmation Modal */}
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setClearModalOpen(false)}
        onConfirm={handleClearConfirm}
      />

      {/* Decorative ambient background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#DDEDEA]/40 via-[#FAF8F2]/60 to-transparent pointer-events-none -z-10 blur-2xl" />
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#0B6B6B]/5 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                My Wishlist
              </h1>
              {!loading && (
                <p className="text-sm text-[#34504D] mt-0.5">
                  {wishlistCount} {wishlistCount === 1 ? "item" : "items"} saved for later
                </p>
              )}
            </div>
          </div>

            {/* Actions on Top Right when items exist */}
            {!loading && wishlistCount > 0 && (
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="hidden sm:inline-flex items-center text-sm font-semibold text-[#0B6B6B] hover:underline"
                >
                  ← Continue shopping
                </Link>
                <button
                  type="button"
                  onClick={() => setClearModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#B91C1C] hover:text-red-700 bg-white hover:bg-rose-50 border border-[#E6DFD5] hover:border-rose-200 shadow-2xs transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
            )}
        </div>

        {/* Main Content */}
        {loading && wishlistCount === 0 ? (
          <div className="mt-8">
            <LoadingSkeleton />
          </div>
        ) : wishlistCount === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-8 text-center py-16 sm:py-20 px-6 bg-white rounded-3xl border border-[#E6DFD5] shadow-xs max-w-lg mx-auto"
          >
            <div className="w-20 h-20 rounded-full bg-[#DDEDEA] border border-[#D0E5E0] flex items-center justify-center mx-auto mb-6 text-[#0B6B6B]">
              <Heart className="w-9 h-9 fill-[#0B6B6B]/20 text-[#0B6B6B]" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#172B2A] mb-3">
              Your Wishlist is Empty
            </h2>
            <p className="text-[#34504D] mb-8 text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
              You haven't saved any items yet. Explore our authentic Ayurvedic remedies and formulations to add items.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 h-13 bg-[#0B6B6B] hover:bg-[#084F4F] text-white rounded-xl font-bold text-sm sm:text-base transition-colors shadow-sm"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {wishlistItems.map((product) => (
              <WishlistProductCard
                key={`${product.id ?? product._id ?? "wishlist-item"}-${product.variantId ?? ""}`}
                product={product}
                cardVariants={cardVariants}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
