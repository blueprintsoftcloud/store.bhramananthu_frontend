import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  MinusIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  Check,
  Plus,
  Minus,
  Compass,
  Activity,
  Moon,
  Heart,
  PackageOpen,
  ShoppingBag,
  ArrowRight,
  Star,
  ChevronDown,
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";

import api from "../utils/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { trackMetaAddToCart } from "../utils/metaPixel";
import { normalizeProduct, calculateDiscountedPrice } from "../utils/product";
import { formatProductDescription, stripHtml } from "../utils/sanitizeHtml";
import PageSeo from "../components/seo/PageSeo";
import { ProductJsonLd, BreadcrumbJsonLd } from "../components/seo/JsonLd";
import DeliveryLocationModal from "../cart/DeliveryLocationModal";
import FooterSection from "../components/FooterSection";
import Loader from "../components/Loader";
import bhramananthuLogo from "../assets/Bhramananthulogo.png";
import panakkalLogo from "../assets/Panakkallogo.png";
import herbsInfographic from "../assets/img.jpeg";
import symptomsInfographic from "../assets/img1.jpeg";
import CustomerVideoReviews from "./CustomerVideoReviews";
import ProductReviews from "./ProductReviews";
import { useUiStore } from "../store/uiStore";

export interface ProductVariantOption {
  id: string;
  options: Record<string, string>;
  stock: number;
  priceOverride: number | null;
  discountOverride: number | null;
  image?: string | null;
  secondaryImage?: string | null;
  images?: string[];
  isActive: boolean;
  rating?: number;
  numReviews?: number;
}

export interface DetailProduct {
  id: string;
  code?: string;
  name: string;
  brand?: string;
  price: number;
  image?: string;
  images?: string[];
  stock?: number;
  description?: string;
  category?: { name?: string; description?: string } | string;
  discount?: number;
  rating?: number;
  numReviews?: number;
  metaTitle?: string;
  metaDescription?: string;
  variants?: ProductVariantOption[];
}

interface PackOption {
  id: string;
  variantId: string | null;
  variant: ProductVariantOption | null;
  packCount: number;
  label: string;
  subtext: string | null;
  price: number;
  strikethroughPrice: number | null;
  savings: number | null;
  badge: string | null;
  stock: number;
  image?: string | null;
}

export const herbsList = [
  {
    name: "Sarpagandha",
    botanical: "Rauwolfia serpentina",
    benefits: "Relieves tension, improves sleep, balances Vata, and supports cardiovascular function.",
  },
  {
    name: "Vacha",
    botanical: "Acorus calamus",
    benefits: "Balances Vata, promotes mental clarity, calms anxiety, and supports balance restoration.",
  },
  {
    name: "Ushira",
    botanical: "Vetiveria zizanioides",
    benefits: "Reduces dizziness, relaxes nerves, improves mental clarity, and purifies the blood.",
  },
  {
    name: "Grnjanaka",
    botanical: "Allium ascalonicum",
    benefits: "Enhances brain and nerve health, reduces oxidative stress, and supports immunity.",
  },
  {
    name: "Jatamamsi",
    botanical: "Nardostachys jatamansi",
    benefits: "Reduces anxiety, improves sleep, balances Vata, and enhances nerve stability.",
  },
  {
    name: "Brahmi",
    botanical: "Bacopa monnieri",
    benefits: "Neuroprotective, anti-inflammatory, enhances memory, and supports ear balance.",
  },
  {
    name: "Ashwagandha",
    botanical: "Withania somnifera",
    benefits: "Balances Vata, reduces anxiety, improves circulation, and calms the mind.",
  },
  {
    name: "Kaidarya",
    botanical: "Murraya koenigii",
    benefits: "Pacifies Vata and Pitta, improves ear circulation, and supports equilibrium.",
  },
  {
    name: "Shigru",
    botanical: "Moringa oleifera",
    benefits: "Reduces inflammation, nourishes nerves, supports balance and coordination.",
  },
  {
    name: "Haritaki",
    botanical: "Terminalia chebula",
    benefits: "Improves concentration, relieves mental tension, and enhances nerve regeneration.",
  },
  {
    name: "Tulsi",
    botanical: "Ocimum sanctum",
    benefits: "Reduces vertigo-related inflammation, fights infections, and calms the mind.",
  },
  {
    name: "Apamarga",
    botanical: "Achyranthes aspera",
    benefits: "Soothes ear pain, purifies blood, and promotes ear health.",
  },
  {
    name: "Shankhapushpi",
    botanical: "Clitoria ternatea",
    benefits: "Reduces stress, enhances clarity, improves sleep, and supports nerve strength.",
  },
  {
    name: "Nalikera",
    botanical: "Cocos nucifera · coconut oil base",
    benefits: "Moisturizes, heals, and enhances herbal efficacy.",
  },
];

export const faqList = [
  {
    question: "What is Bhramananthu Oil and how is it used?",
    answer:
      "Bhramananthu Oil is an authentic Ayurvedic medicated oil specifically formulated for ear imbalance, vertigo, head heaviness, tinnitus, and insomnia. Apply 15 drops to the apex (crown) of the head, leave for 10–15 minutes, and then wipe off or wash.",
  },
  {
    question: "How does Ayurveda help in ear balance problems like vertigo and dizziness?",
    answer:
      "In Ayurveda, vertigo (Bhrama) is attributed to an aggravated Vata and Pitta dosha affecting the nervous system and inner ear channels. Bhramananthu Oil nourishes the nerve pathways, improves micro-circulation to the vestibular system, and calms neurological tension.",
  },
  {
    question: "How long does it take to see results with Ayurvedic medicines?",
    answer:
      "Most individuals experience noticeable relief from head heaviness and sleep disturbance within 3 to 7 days. For vestibular balance and long-standing vertigo or tinnitus, continuous application for 2 to 4 weeks is recommended.",
  },
  {
    question: "Are Ayurvedic medicines safe for long-term use?",
    answer:
      "Yes. Bhramananthu Oil is prepared strictly according to traditional Tailapaka vidhi using pure, potent medicinal herbs in a pure coconut oil base. It contains no synthetic additives, colors, or harsh chemicals. It is safe for external use.",
  },
  {
    question: "Can I pay cash when it arrives?",
    answer:
      "Yes! Cash on Delivery (COD) is available across all serviceable delivery pincodes across India, in addition to UPI, credit/debit cards, and Net Banking.",
  },
];

interface BhramananthuProductDetailProps {
  productId?: string;
}

export default function BhramananthuProductDetail({ productId }: BhramananthuProductDetailProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addToCart, fetchCart, cartItems } = useCart();
  const { isProductInWishlist, toggleWishlist } = useWishlist();
  const isMobileMenuOpen = useUiStore((state) => state.isMobileMenuOpen);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<DetailProduct | null>(null);
  const [productRating, setProductRating] = useState<{ rating: number; numReviews: number }>({
    rating: 0,
    numReviews: 0,
  });
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  // Pack & Quantity state
  const [selectedPackIndex, setSelectedPackIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Gallery state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // 1. Fetch Product Data
  useEffect(() => {
    let isMounted = true;
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        let targetId = productId;
        // If no productId supplied, load first active product
        if (!targetId) {
          const listRes = await api.get("/user/shop/products?limit=1");
          const first = listRes.data?.products?.[0];
          if (!first) {
            if (isMounted) {
              setProduct(null);
              setError("No products available at the moment.");
            }
            return;
          }
          targetId = first.id || first._id;
        }

        let res;
        try {
          res = await api.get(`/user/shop/product/${targetId}`);
        } catch (fetchErr: any) {
          // If a specific productId was requested but deleted / not found (404),
          // fallback to loading the first active product in the store
          if (fetchErr.response?.status === 404 && productId) {
            const listRes = await api.get("/user/shop/products?limit=1");
            const first = listRes.data?.products?.[0];
            if (first) {
              const fallbackId = first.id || first._id;
              res = await api.get(`/user/shop/product/${fallbackId}`);
            }
          }
          if (!res) throw fetchErr;
        }

        if (!isMounted) return;

        if (res?.data?.product) {
          const norm = normalizeProduct(res.data.product);
          setProduct(norm);
          setProductRating({
            rating: norm.rating || 0,
            numReviews: norm.numReviews || 0,
          });
          setSelectedImageIndex(0);
          setSelectedPackIndex(0);
          setQuantity(1);
        } else {
          setProduct(null);
          setError("Product not found");
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to load product:", err);
        setProduct(null);
        setError(err.response?.status === 404 ? "Product not found" : "Error loading product details");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  // 2. Generate Pack Options (Handles both Products with Variants and Normal Products)
  const hasVariants = Boolean(product?.variants && product.variants.length > 0);

  const packOptions: PackOption[] = useMemo(() => {
    if (!product) return [];

    if (hasVariants && product.variants && product.variants.length > 0) {
      const activeVariants = product.variants.filter((v) => v.isActive !== false);
      if (activeVariants.length === 0) return [];

      // Determine single-unit benchmark base price (MRP)
      const firstVariant = activeVariants[0];
      const baseUnitOriginalPrice = firstVariant?.priceOverride ?? product.price ?? 350;

      return activeVariants.map((v, idx) => {
        const rawOptVal = Object.values(v.options || {})[0] || "";
        const numMatch = rawOptVal.match(/\b(\d+)\b/);
        const parsedCount = numMatch ? parseInt(numMatch[1], 10) : null;
        const packNum = parsedCount && parsedCount > 0 ? parsedCount : idx + 1;

        let label = `${packNum} bottle${packNum > 1 ? "s" : ""}`;
        if (rawOptVal) {
          if (rawOptVal.toLowerCase().includes("1") && rawOptVal.toLowerCase().includes("bottle")) label = "1 bottle";
          else if (rawOptVal.toLowerCase().includes("2") && rawOptVal.toLowerCase().includes("bottle")) label = "2 bottles";
          else if (rawOptVal.toLowerCase().includes("3") && rawOptVal.toLowerCase().includes("bottle")) label = "3 bottles";
          else label = rawOptVal;
        }

        // Variant base / entered selling price
        const varEnteredPrice = v.priceOverride ?? (baseUnitOriginalPrice * packNum);
        
        // Variant discount percentage (per-variant override only)
        const discountPct = Number(v.discountOverride) || 0;

        // Effective customer selling price (after discount)
        const price = discountPct > 0 
          ? calculateDiscountedPrice(varEnteredPrice, discountPct) 
          : varEnteredPrice;

        // Full benchmark valuation before discount or bundle savings
        const fullBenchmark = Math.max(varEnteredPrice, baseUnitOriginalPrice * packNum);

        // Strikethrough cut-off price is displayed if the final price is lower than the benchmark valuation
        const strikethroughPrice = fullBenchmark > price ? fullBenchmark : null;

        // Savings calculation
        const savings = strikethroughPrice && strikethroughPrice > price ? strikethroughPrice - price : null;

        // Smart badges
        const badge = packNum === 2 ? "Most chosen" : packNum === 3 ? "Best value" : null;

        let subtext: string | null = null;
        if (packNum === 1) {
          if (savings && savings > 0) {
            subtext = `You save ₹${savings.toLocaleString()}`;
          } else {
            subtext = "20 ml dropper bottle";
          }
        } else if (savings && savings > 0) {
          subtext = `You save ₹${savings.toLocaleString()}`;
        }

        return {
          id: v.id,
          variantId: v.id,
          variant: v,
          packCount: packNum,
          label,
          subtext,
          price,
          strikethroughPrice,
          savings,
          badge,
          stock: v.stock ?? 10,
          image: v.image || null,
        };
      });
    }

    // Normal Product without variants in database: provide the 3-tier pack UI with dynamic discount
    const basePrice = product.price ?? 350;
    const baseDiscount = product.discount ?? 0;
    
    // Tier 1 (1 bottle)
    const tier1Price = baseDiscount > 0 ? calculateDiscountedPrice(basePrice, baseDiscount) : basePrice;
    const tier1Cutoff = baseDiscount > 0 ? basePrice : null;
    const tier1Savings = tier1Cutoff ? tier1Cutoff - tier1Price : null;

    // Tier 2 (2 bottles)
    const tier2Cutoff = basePrice * 2;
    const tier2Price = Math.max(0, (tier1Price * 2) - (baseDiscount > 0 ? 0 : 50));
    const tier2Savings = tier2Cutoff > tier2Price ? tier2Cutoff - tier2Price : 50;

    // Tier 3 (3 bottles)
    const tier3Cutoff = basePrice * 3;
    const tier3Price = Math.max(0, (tier1Price * 3) - (baseDiscount > 0 ? 0 : 100));
    const tier3Savings = tier3Cutoff > tier3Price ? tier3Cutoff - tier3Price : 100;

    return [
      {
        id: "normal-pack-1",
        variantId: null,
        variant: null,
        packCount: 1,
        label: "1 bottle",
        subtext: tier1Savings && tier1Savings > 0 ? `You save ₹${tier1Savings.toLocaleString()}` : "20 ml dropper bottle",
        price: tier1Price,
        strikethroughPrice: tier1Cutoff,
        savings: tier1Savings,
        badge: null,
        stock: product.stock ?? 10,
        image: product.image,
      },
      {
        id: "normal-pack-2",
        variantId: null,
        variant: null,
        packCount: 2,
        label: "2 bottles",
        subtext: `You save ₹${tier2Savings.toLocaleString()}`,
        price: tier2Price,
        strikethroughPrice: tier2Cutoff,
        savings: tier2Savings,
        badge: "Most chosen",
        stock: product.stock ?? 10,
        image: product.image,
      },
      {
        id: "normal-pack-3",
        variantId: null,
        variant: null,
        packCount: 3,
        label: "3 bottles",
        subtext: `You save ₹${tier3Savings.toLocaleString()}`,
        price: tier3Price,
        strikethroughPrice: tier3Cutoff,
        savings: tier3Savings,
        badge: "Best value",
        stock: product.stock ?? 10,
        image: product.image,
      },
    ];
  }, [hasVariants, product]);

  const activePack = packOptions[selectedPackIndex] || packOptions[0];
  const effectiveStock = activePack?.stock ?? product?.stock ?? 10;
  const isOutOfStock = effectiveStock <= 0;
  const unitPrice = activePack?.price ?? product?.price ?? 0;
  const totalPrice = unitPrice * quantity;

  // Cart Matching: Detect if this product or specific pack is already in customer's cart
  const itemsOfThisProductInCart = useMemo(() => {
    if (!product) return [];
    return cartItems.filter((item) => String(item.productId) === String(product.id));
  }, [cartItems, product]);

  const isProductInCart = itemsOfThisProductInCart.length > 0;

  const getPackCartItem = useCallback(
    (pack: PackOption) => {
      if (!product || itemsOfThisProductInCart.length === 0) return undefined;
      if (pack.variantId) {
        return itemsOfThisProductInCart.find(
          (item) => String(item.variantId) === String(pack.variantId)
        );
      }
      const exactMatch = itemsOfThisProductInCart.find(
        (item) => item.quantity === pack.packCount
      );
      if (exactMatch) return exactMatch;
      return itemsOfThisProductInCart[0];
    },
    [itemsOfThisProductInCart, product]
  );

  const activePackCartItem = useMemo(() => {
    if (!activePack) return undefined;
    return getPackCartItem(activePack);
  }, [activePack, getPackCartItem]);

  const isSelectedPackInCart = Boolean(activePackCartItem);

  // 3. Image Gallery Management: Stable natural order [1 bottle, 2 bottles, 3 bottles, ...]
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const set = new Set<string>();

    // 1. Variant images in natural order (Variant 1: 1 bottle, Variant 2: 2 bottles, Variant 3: 3 bottles)
    if (Array.isArray(product.variants)) {
      product.variants.forEach((v) => {
        if (v.image && typeof v.image === "string" && v.image.trim()) {
          set.add(v.image);
        }
        if (Array.isArray(v.images)) {
          v.images.forEach((img) => {
            if (img && typeof img === "string" && img.trim()) set.add(img);
          });
        }
      });
    }

    // 2. Main product image (if not already included)
    if (product.image) {
      set.add(product.image);
    }

    // 3. Product extra gallery images (if any)
    if (Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (img && typeof img === "string" && img.trim()) set.add(img);
      });
    }

    const list = Array.from(set);
    return list.length > 0 ? list : ["https://placehold.co/600x800?text=No+Image"];
  }, [product]);

  // Preload all gallery images into browser cache so switching variants is instant and smooth
  useEffect(() => {
    if (galleryImages.length > 0) {
      galleryImages.forEach((src) => {
        if (src && typeof src === "string" && !src.includes("placehold.co")) {
          const img = new Image();
          img.src = src;
        }
      });
    }
  }, [galleryImages]);

  const buySectionRef = useRef<HTMLDivElement>(null);
  const [showFloatingBar, setShowFloatingBar] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      const target =
        buySectionRef.current ||
        document.getElementById("main-buy-section") ||
        document.getElementById("product-pack-section");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      // Inline buy buttons are in view if the section overlaps the active screen area
      const isInlineInView = rect.bottom > 100 && rect.top < viewportHeight - 60;
      setShowFloatingBar(!isInlineInView);
    };

    checkVisibility();
    window.addEventListener("scroll", checkVisibility, { passive: true });

    // Also listen to internal scroll containers (CustomerLayout scroll wrapper)
    const scrollContainers = document.querySelectorAll(".overflow-y-auto");
    scrollContainers.forEach((el) => el.addEventListener("scroll", checkVisibility, { passive: true }));

    return () => {
      window.removeEventListener("scroll", checkVisibility);
      scrollContainers.forEach((el) => el.removeEventListener("scroll", checkVisibility));
    };
  }, [loading]);

  const handlePackSelect = useCallback((index: number) => {
    setSelectedPackIndex(index);
    const chosen = packOptions[index];
    if (chosen?.image) {
      const imgIdx = galleryImages.indexOf(chosen.image);
      if (imgIdx !== -1) {
        setSelectedImageIndex(imgIdx);
      }
    }
  }, [packOptions, galleryImages]);

  const handleThumbnailClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
    // If this thumbnail matches a pack variant, also select that pack on the right
    const targetUrl = galleryImages[index];
    const matchedPackIdx = packOptions.findIndex((p) => p.image === targetUrl);
    if (matchedPackIdx !== -1) {
      setSelectedPackIndex(matchedPackIdx);
    }
  }, [galleryImages, packOptions]);

  // 4. Quantity Adjustments
  const handleDecreaseQuantity = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  const handleIncreaseQuantity = () => {
    if (quantity >= effectiveStock) {
      toast.error(`Only ${effectiveStock} item(s) available in stock`, { id: "max-stock-reached" });
      return;
    }
    setQuantity((q) => q + 1);
  };

  // 5. Add To Cart Handler
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!user.isAuthenticated) {
      toast("Please sign in to add items to your cart.", { id: "auth-login-needed" });
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }

    if (isOutOfStock) {
      toast.error("Sorry, this item is out of stock.", { id: "oos-error" });
      return;
    }

    setIsAdding(true);
    try {
      if (activePack.variantId) {
        // Variant Product
        await addToCart(product.id, {
          quantity: quantity,
          variantId: activePack.variantId,
        });
      } else {
        // Normal Product (Multi-pack multiplier)
        await addToCart(product.id, {
          quantity: activePack.packCount * quantity,
          variantId: null,
        });
      }
      toast.success(`${product.name} (${activePack.label} × ${quantity}) added to cart!`, {
        id: "added-cart-toast",
      });
      // Meta Pixel: Track AddToCart
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "AddToCart");
      }
      trackMetaAddToCart({
        id: product.id,
        name: product.name,
        price: activePack.price,
        quantity: quantity,
      });
      fetchCart();
    } catch (err: any) {
      console.error("Add to cart error:", err);
      toast.error(err.response?.data?.message || "Failed to add to cart.", { id: "add-cart-fail" });
    } finally {
      setIsAdding(false);
    }
  };

  // 6. Buy Now Handler
  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!user.isAuthenticated) {
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }

    if (isOutOfStock) {
      toast.error("Sorry, this item is out of stock.", { id: "oos-error-buynow" });
      return;
    }

    setShowDeliveryModal(true);
  };

  // 6b. Floating Buy Now Handler
  const handleFloatingBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    const target =
      document.getElementById("product-pack-section") ||
      document.getElementById("main-buy-section");

    if (target) {
      const rect = target.getBoundingClientRect();
      // If the buy section is already near/in view, open buy now modal directly
      if (rect.top >= -50 && rect.top <= 250) {
        handleBuyNow(e);
        return;
      }

      const headerOffset = 75;
      const elementPosition = target.getBoundingClientRect().top;
      const scrollContainer = document.querySelector(".overflow-y-auto");

      if (scrollContainer) {
        const containerTop = scrollContainer.getBoundingClientRect().top;
        const currentScroll = scrollContainer.scrollTop;
        const targetScroll = currentScroll + (elementPosition - containerTop) - headerOffset;
        scrollContainer.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
      } else {
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: Math.max(0, offsetPosition), behavior: "smooth" });
      }
    } else {
      handleBuyNow(e);
    }
  };

  const isWishlisted = Boolean(product && isProductInWishlist(product.id, activePack?.variantId));

  const handleToggleWishlist = async () => {
    if (!product) return;
    if (!user.isAuthenticated) {
      toast.error("Please login to add product to wishlist", { id: "login-wishlist" });
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }

    setIsWishlistLoading(true);
    try {
      const success = await toggleWishlist(product.id, activePack?.variantId);
      if (success) {
        toast.success(isWishlisted ? "Removed from wishlist" : "Saved to wishlist", {
          id: "wishlist-toggled",
        });
      } else {
        toast.error("Could not update wishlist", { id: "wishlist-err" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsWishlistLoading(false);
    }
  };

  if (loading) {
    return (
      <Loader
        fullScreen={false}
        message="Loading details"
        className="pt-[calc(var(--app-header-h,120px)+28px)] min-h-screen bg-[#FAF8F2]"
      />
    );
  }

  const rawCatName =
    (product as any)?.categoryName ||
    (typeof product?.category === "object" ? product?.category?.name : product?.category) ||
    "";
  const isCatObjectId = typeof rawCatName === "string" && /^[0-9a-fA-F]{24}$/.test(rawCatName.trim());
  const categoryDisplayName = !isCatObjectId && rawCatName.trim() ? rawCatName.trim() : (product?.name || "Bhramananthu Oil");

  const rawCatDesc = typeof product?.category === "object" ? product?.category?.description : "";
  const categoryDesc = rawCatDesc && rawCatDesc.trim() ? rawCatDesc.trim() : "100% Ayurvedic Ultra Premium Oil · 20 ml";

  return (
    <div className="bg-[#FAF8F2] min-h-screen text-[#172B2A] font-body selection:bg-[#DDEDEA] selection:text-[#0B6B6B]">
      {/* SEO & JSON-LD */}
      <PageSeo
        title={product?.metaTitle?.trim() || (product ? `${product.name} | Panakkal Ayurveda` : "Bhramananthu Oil | Panakkal Ayurveda")}
        description={
          product?.metaDescription?.trim() ||
          product?.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) ||
          "A natural Ayurvedic formulation for ear imbalance and vertigo relief. A product by Panakkal Ayurveda Pharmacy."
        }
        image={galleryImages[0] || panakkalLogo}
        path={product ? `/products/${product.id}` : "/"}
      />
      {product && (
        <ProductJsonLd
          product={{
            id: product.id,
            name: product.name,
            description: product.description?.replace(/<[^>]*>/g, " ").slice(0, 160),
            brand: product.brand || "Panakkal Ayurveda",
            code: product.code || product.id,
            price: unitPrice,
            image: galleryImages[0] || panakkalLogo,
            images: galleryImages,
            inStock: !isOutOfStock,
          }}
        />
      )}
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          ...(product
            ? [
                { name: categoryDisplayName || "Ayurvedic Store", path: "/" },
                { name: product.name, path: `/products/${product.id}` },
              ]
            : [{ name: "Bhramananthu Oil", path: "/" }]),
        ]}
      />

      {/* Main 2-Column Product Grid (Shown only if product is available) */}
      {product && (
        <main
          id="product-hero"
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(var(--app-header-h,120px)+12px)] sm:pt-[calc(var(--app-header-h,120px)+24px)] lg:pt-[calc(var(--app-header-h,120px)+36px)] pb-16 sm:pb-20 scroll-mt-[calc(var(--app-header-h,120px)+24px)]"
        >
        {/* Main 2-Column Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-12 items-start">
          
          {/* ================= LEFT COLUMN: IMAGE GALLERY ================= */}
          <div
            id="product-image-section"
            className="scroll-mt-[calc(var(--app-header-h,120px)+24px)] lg:col-span-6 flex flex-col gap-2.5 sm:gap-4 sticky lg:top-[calc(var(--app-header-h,120px)+20px)]"
          >
            {/* Main Interactive Image Frame - compact and well-proportioned on mobile */}
            <div className="relative w-full max-w-[260px] xs:max-w-[290px] sm:max-w-none mx-auto h-[220px] xs:h-[250px] sm:h-auto sm:aspect-[4/5] overflow-hidden rounded-2xl bg-white border border-[#E3DCCE] shadow-sm flex items-center justify-center select-none">
              {galleryImages.map((imgSrc, idx) => {
                const isActive = idx === selectedImageIndex;
                return (
                  <img
                    key={imgSrc || idx}
                    src={imgSrc}
                    alt={`${product.name} view ${idx + 1}`}
                    loading="eager"
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-contain p-2.5 sm:p-4 select-none pointer-events-none transition-opacity duration-200 ease-out ${
                      isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    }`}
                    draggable={false}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (product?.image && target.src !== product.image) {
                        target.src = product.image;
                      } else {
                        target.src = "https://placehold.co/600x800?text=No+Image";
                      }
                    }}
                  />
                );
              })}

              {/* Prev / Next Carousel Controls */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((i) => Math.max(0, i - 1));
                    }}
                    disabled={selectedImageIndex === 0}
                    className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 shadow-md text-[#1E2827] hover:bg-white disabled:opacity-30 transition-all cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex((i) => Math.min(galleryImages.length - 1, i + 1));
                    }}
                    disabled={selectedImageIndex === galleryImages.length - 1}
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 shadow-md text-[#1E2827] hover:bg-white disabled:opacity-30 transition-all cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                  </button>
                </>
              )}

              {/* Image Counter Badge */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-20 bg-[#172B2A]/75 backdrop-blur-xs text-white text-[11px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full pointer-events-none">
                  {selectedImageIndex + 1} / {galleryImages.length}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {galleryImages.length > 1 && (
              <div className="flex items-center gap-2 sm:gap-3.5 overflow-x-auto pt-1.5 sm:pt-3 pb-0.5 sm:pb-1 justify-center sm:justify-start [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {galleryImages.map((img, i) => {
                  const isSelected = i === selectedImageIndex;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleThumbnailClick(i)}
                      className={`flex-shrink-0 w-12 h-12 xs:w-14 xs:h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-white p-1 sm:p-2 border-2 transition-colors duration-150 cursor-pointer ${
                        isSelected
                          ? "border-[#0B6B6B] shadow-xs"
                          : "border-[#E2D9CC] hover:border-[#0B6B6B]/60"
                      }`}
                      aria-label={`View image ${i + 1}`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} thumbnail ${i + 1}`}
                        className="w-full h-full object-contain p-0.5 pointer-events-none"
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/600x800?text=No+Image";
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= RIGHT COLUMN: PRODUCT DETAILS & BUYING FLOW ================= */}
          <div className="lg:col-span-6 flex flex-col">
            
            {/* 1. Category / Dosage Subtitle */}
            <p className="text-xs sm:text-base font-bold text-[#0B5858] tracking-normal mb-1 sm:mb-2">
              {categoryDesc}
            </p>

            {/* 2. Logo at Left along with Category Name */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 mb-2 sm:mb-3">
              <img
                src={bhramananthuLogo}
                alt={categoryDisplayName}
                className="h-8 sm:h-12 w-auto object-contain shrink-0"
              />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#172B2A] tracking-tight leading-tight">
                {categoryDisplayName}
              </h1>
            </div>

            {/* Price & Stock Display Header - positioned directly under title for first-screen visibility */}
            <div id="product-pack-section" className="mt-1 sm:mt-2 mb-3 sm:mb-5 scroll-mt-20">
              <div className="flex items-baseline gap-2 sm:gap-2.5 flex-wrap">
                <span className="text-2xl sm:text-4xl font-serif font-bold text-[#172B2A]">
                  ₹{unitPrice.toLocaleString()}
                </span>
                {activePack?.strikethroughPrice && activePack.strikethroughPrice > unitPrice && (
                  <span className="text-base sm:text-xl text-gray-400 line-through font-medium">
                    ₹{activePack.strikethroughPrice.toLocaleString()}
                  </span>
                )}
                <span className="text-xs sm:text-base font-medium text-[#4A5554]">
                  for {activePack?.label}
                </span>
                {activePack?.savings && activePack.savings > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-[#E8F5E9] text-[#1E7E34] border border-[#C8E6C9]">
                    Save ₹{activePack.savings.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-sm text-[#6B7B79] mt-0.5">
                Inclusive of all taxes
              </p>

              {/* In stock and Cart indicators */}
              <div className="flex items-center gap-3 mt-1.5 sm:mt-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOutOfStock ? "bg-red-500" : "bg-[#16A34A] animate-pulse"
                    }`}
                  />
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      isOutOfStock ? "text-red-600" : "text-[#16A34A]"
                    }`}
                  >
                    {isOutOfStock ? "Out of stock" : "In stock"}
                  </span>
                </div>

                {isSelectedPackInCart && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DDEDEA] text-[#0B6B6B] border border-[#CDE5E0] text-xs font-bold shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>In your cart ({activePackCartItem?.quantity} in cart)</span>
                  </span>
                )}
              </div>
            </div>

            {/* 3. Short Summary Description */}
            <p className="text-[#2D3E3C] text-xs sm:text-[15px] leading-relaxed mb-3 sm:mb-4 font-body">
              An effective Ayurvedic solution for ear balance and natural relief for vertigo and ear problems. It works by nourishing the nerves, improving circulation and restoring dosha harmony.
            </p>

            {/* 4. Key Feature Pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 mb-4 sm:mb-6">
              <span className="inline-flex items-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-bold bg-[#EFE8DB] text-[#1A2624] border border-[#DFD6C5]">
                14 herbs
              </span>
              <span className="inline-flex items-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-bold bg-[#EFE8DB] text-[#1A2624] border border-[#DFD6C5]">
                Hygienic dropper bottle
              </span>
              <span className="inline-flex items-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-bold bg-[#EFE8DB] text-[#1A2624] border border-[#DFD6C5]">
                For external use only
              </span>
            </div>

            {/* Choose Your Pack Section */}
            <div className="mb-6">
              <h2 className="text-base sm:text-lg font-bold text-[#1E2827] mb-3 tracking-tight">
                Choose your pack
              </h2>

              <div className="flex flex-col gap-3.5 pt-1">
                {packOptions.map((pack, idx) => {
                  const isSelected = idx === selectedPackIndex;
                  const packCartItem = getPackCartItem(pack);
                  const isPackInCart = Boolean(packCartItem);

                  return (
                    <div
                      key={pack.id}
                      onClick={() => handlePackSelect(idx)}
                      className={`relative flex items-center justify-between p-4 rounded-xl cursor-pointer border-2 transition-colors duration-150 select-none ${
                        isSelected
                          ? "border-[#0B6B6B] bg-[#F4F9F8] shadow-xs"
                          : "border-[#D1DCDA] bg-white hover:border-[#0B6B6B]/60"
                      }`}
                    >
                      {/* Badge (Most chosen / Best value) */}
                      {pack.badge && (
                        <span className="absolute -top-3 left-4 bg-[#E5A83B] text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs tracking-wide pointer-events-none">
                          {pack.badge}
                        </span>
                      )}

                      {/* Left: Radio + Title + Subtext */}
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors duration-150 bg-white ${
                            isSelected ? "border-[#0B6B6B]" : "border-gray-400"
                          }`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full bg-[#0B6B6B] transition-all duration-150 ${
                              isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                            }`}
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base sm:text-lg text-[#1E2827] leading-tight">
                              {pack.label}
                            </span>
                            {isPackInCart && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B6B6B] bg-[#DDEDEA] border border-[#CDE5E0] px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                In cart
                              </span>
                            )}
                          </div>
                          {pack.subtext && (
                            <div className="text-xs sm:text-sm text-[#5A6B68] mt-0.5 underline decoration-dotted decoration-[#5A6B68]/60">
                              {pack.subtext}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Strikethrough + Final Price */}
                      <div className="text-right">
                        {pack.strikethroughPrice && pack.strikethroughPrice > pack.price && (
                          <div className="text-xs sm:text-sm text-gray-400 line-through font-medium">
                            ₹{pack.strikethroughPrice.toLocaleString()}
                          </div>
                        )}
                        <div className="text-base sm:text-lg font-bold text-[#1E2827] leading-tight">
                          ₹{pack.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quantity Stepper & Wishlist Button */}
            <div className="flex items-center gap-3 sm:gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#1E2827] text-base">Quantity</span>
                <div className="inline-flex items-center border border-[#1E2827] rounded-xl px-2 py-1 bg-white shadow-xs">
                  <button
                    type="button"
                    onClick={handleDecreaseQuantity}
                    disabled={quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center text-lg font-bold text-[#1E2827] hover:text-[#0B6B6B] disabled:opacity-25 transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <MinusIcon className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  <span className="px-4 text-base font-bold text-[#1E2827] min-w-[28px] text-center select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncreaseQuantity}
                    disabled={quantity >= effectiveStock}
                    className="w-8 h-8 flex items-center justify-center text-lg font-bold text-[#1E2827] hover:text-[#0B6B6B] disabled:opacity-25 transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <PlusIcon className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {/* Wishlist Heart Icon Button */}
              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={isWishlistLoading}
                className={`inline-flex items-center justify-center w-[42px] h-[42px] rounded-xl border transition-all duration-200 cursor-pointer shadow-xs select-none ${
                  isWishlisted
                    ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                    : "bg-white border-[#1E2827] text-[#1E2827] hover:border-[#0B6B6B] hover:text-[#0B6B6B]"
                }`}
                title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              >
                <Heart
                  className={`w-5 h-5 transition-transform duration-200 active:scale-125 ${
                    isWishlisted ? "fill-rose-500 text-rose-500" : "text-current"
                  }`}
                />
              </button>
            </div>

            {/* Primary Action Buttons */}
            <div ref={buySectionRef} id="main-buy-section" className="flex flex-col gap-3 mb-6">
              {isSelectedPackInCart ? (
                <>
                  {/* Go to Cart Button */}
                  {/* Buy Now Button (Top Primary) */}
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={isAdding || isOutOfStock}
                    className="w-full h-14 bg-[#0B6B6B] hover:bg-[#085555] active:scale-[0.99] text-white font-bold text-base rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Buy now
                  </button>

                  <div className="flex gap-2.5 sm:gap-3">
                    {/* Go to cart Button */}
                    <button
                      type="button"
                      onClick={() => navigate("/cart")}
                      className="flex-1 h-12 bg-white border-2 border-[#0B6B6B] hover:bg-[#0B6B6B]/5 active:scale-[0.99] text-[#0B6B6B] font-bold text-sm rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
                      <span>Go to cart</span>
                      <span className="text-[11px] bg-[#0B6B6B]/10 text-[#0B6B6B] px-1.5 py-0.5 rounded-full font-bold">
                        {activePackCartItem?.quantity}
                      </span>
                    </button>

                    {/* Add More Button */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isAdding || isOutOfStock}
                      className="flex-1 h-12 bg-[#FAF8F2] border border-[#1E2827]/30 hover:border-[#1E2827] active:scale-[0.99] text-[#1E2827] font-bold text-sm rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add more to cart"
                    >
                      {isAdding ? (
                        <BeatLoader size={6} color="#0B6B6B" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>Add more (+{quantity})</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Buy Now Button */}
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={isAdding || isOutOfStock}
                    className="w-full h-14 bg-[#0B6B6B] hover:bg-[#085555] active:scale-[0.99] text-white font-bold text-base rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Buy now
                  </button>

                  {/* Add to Cart Button */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding || isOutOfStock}
                    className="w-full h-14 bg-white border-2 border-[#0B6B6B] hover:bg-[#0B6B6B]/5 active:scale-[0.99] text-[#0B6B6B] font-bold text-base rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdding ? (
                      <BeatLoader size={8} color="#0B6B6B" />
                    ) : isOutOfStock ? (
                      "Out of Stock"
                    ) : (
                      `Add to cart · ₹${totalPrice.toLocaleString()}`
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Trust Perks (3 Badges) */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 my-2">
              <div className="bg-[#F3EBE0] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2">
                <svg
                  className="w-6 h-6 text-[#0B6B6B]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span className="text-xs sm:text-[13px] font-bold text-[#1E2827] underline decoration-dotted decoration-gray-400">
                  Cash on delivery
                </span>
              </div>

              <div className="bg-[#F3EBE0] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2">
                <svg
                  className="w-6 h-6 text-[#0B6B6B]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <span className="text-xs sm:text-[13px] font-bold text-[#1E2827] underline decoration-dotted decoration-gray-400">
                  Free delivery across India
                </span>
              </div>

              <div className="bg-[#F3EBE0] rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center gap-2">
                <svg
                  className="w-6 h-6 text-[#0B6B6B]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-xs sm:text-[13px] font-bold text-[#1E2827]">
                  Secure payment
                </span>
              </div>
            </div>

            {/* Prefer To Order By Phone Helpline Dotted Box */}
            <div className="border-2 border-dashed border-[#0B6B6B]/60 rounded-xl p-4 sm:p-5 mt-5 bg-transparent">
              <p className="text-sm sm:text-base font-serif text-[#1E2827]">
                Prefer to order by phone?
              </p>
              <a
                href="tel:+917593875934"
                className="inline-block text-2xl sm:text-3xl font-serif font-bold text-[#172B2A] my-1 hover:text-[#0B6B6B] transition-colors"
              >
                +91 75938 75934
              </a>
              <p className="text-xs sm:text-sm text-[#4A5554] mt-1">
                Call or WhatsApp. We will take your order and answer your questions.
              </p>
            </div>
          </div>
        </div>

        {/* ================= 3 QUICK INFO CARDS (Page 2) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 mb-8">
          {/* Card 1: How to use */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8E0D5] shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-4">How to use</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="font-bold text-[#172B2A] w-20 shrink-0">Usage</span>
                  <span className="text-[#3A4A48] leading-relaxed">
                    For external use only, as directed by an Ayurvedic practitioner
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-bold text-[#172B2A] w-20 shrink-0">Dosage</span>
                  <span className="text-[#3A4A48] leading-relaxed">
                    15 drops on the top of the head, once a day
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-bold text-[#172B2A] w-20 shrink-0">Best time</span>
                  <span className="text-[#3A4A48] leading-relaxed">
                    After 4 pm, or at bedtime
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: More information */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8E0D5] shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-4">More information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#172B2A] w-28 shrink-0">Net content</span>
                  <span className="text-[#3A4A48]">20 ml</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#172B2A] w-28 shrink-0">Packaging</span>
                  <span className="text-[#3A4A48]">Hygienic dropper bottle</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#172B2A] w-28 shrink-0">Prescription</span>
                  <span className="text-[#3A4A48] underline decoration-dotted decoration-gray-400">Not required</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#172B2A] w-28 shrink-0">Returnable</span>
                  <span className="text-[#3A4A48] underline decoration-dotted decoration-gray-400">No</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Details */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8E0D5] shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-4">Details</h3>
              <div className="flex flex-wrap gap-2.5">
                {["100% Ayurvedic", "14 herbs", "Coconut oil base", "Tailapaka vidhi"].map((tag) => (
                  <span
                    key={tag}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E6F3F1] text-[#0B6B6B] border border-[#CDEAE5]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>


      </main>
      )}

      {/* ================= 1. USES OF BHRAMANANTHU OIL ================= */}
      <section
        id="uses"
        className={`scroll-mt-[calc(var(--app-header-h,120px)+20px)] bg-[#F6EFE5] border-y border-[#E8DFC8] ${
          product ? "py-16 sm:py-20" : "pt-[calc(var(--app-header-h,120px)+36px)] pb-16 sm:pb-20"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-left">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#172B2A] tracking-tight">
              Uses of Bhramananthu Oil
            </h2>
            <p className="text-[#4A5A58] text-base sm:text-lg mt-2">
              A natural Ayurvedic formulation for ear imbalance and vertigo relief. A product by Panakkal Ayurveda Pharmacy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Vertigo / Ear Imbalance */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5DDD0] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 rounded-full bg-[#E0EFEA] flex items-center justify-center text-[#0B6B6B] mb-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="w-5 h-5 text-[#0B6B6B]"
                  >
                    <path d="M14.5 6A6.5 6.5 0 1 0 14.5 18" />
                    <path d="M13.5 9A3.5 3.5 0 1 0 13.5 15" />
                  </svg>
                </div>
                <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-2 leading-snug">
                  Vertigo / Ear Imbalance
                </h3>
                <p className="text-sm text-[#4E5E5C] leading-relaxed">
                  A condition caused by the disturbance of the sense of equilibrium and movements.
                </p>
              </div>
            </div>

            {/* Card 2: Head Heaviness */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5DDD0] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 rounded-full bg-[#E0EFEA] flex items-center justify-center text-[#0B6B6B] mb-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-[#0B6B6B]"
                  >
                    <circle cx="12" cy="9.5" r="4.8" />
                    <line x1="8.5" y1="18.5" x2="15.5" y2="18.5" />
                  </svg>
                </div>
                <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-2 leading-snug">
                  Head Heaviness
                </h3>
                <p className="text-sm text-[#4E5E5C] leading-relaxed">
                  A condition caused by stress, poor posture, sinus congestion, or lack of sleep.
                </p>
              </div>
            </div>

            {/* Card 3: Insomnia */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5DDD0] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 rounded-full bg-[#E0EFEA] flex items-center justify-center text-[#0B6B6B] mb-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-[#0B6B6B]"
                  >
                    <path d="M15 5.5A6.5 6.5 0 0 1 7.5 14.5 7 7 0 1 0 15 5.5z" />
                  </svg>
                </div>
                <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-2 leading-snug">
                  Insomnia
                </h3>
                <p className="text-sm text-[#4E5E5C] leading-relaxed">
                  A sleep disorder wherein an individual faces problems with falling asleep and remaining in a rested phase through the night.
                </p>
              </div>
            </div>

            {/* Card 4: Ear Tinnitus */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5DDD0] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 rounded-full bg-[#E0EFEA] flex items-center justify-center text-[#0B6B6B] mb-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-[#0B6B6B]"
                  >
                    <path d="M7.5 16.5c-1.5 0-2.2-.8-2.2-2 0-2 2-3 2.5-4.2.4-1.2 0-2.8-1.5-2.8-1.2 0-2 .8-2.2 2" />
                    <path d="M13 8.5c.8 1 1.2 2.2 1.2 3.5" />
                    <path d="M16.5 6.5c1.4 1.7 2.2 3.6 2.2 5.5" />
                  </svg>
                </div>
                <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-2 leading-snug">
                  Ear Tinnitus
                </h3>
                <p className="text-sm text-[#4E5E5C] leading-relaxed">
                  A type of inner ear disorder that can cause problems with balance and hearing.
                </p>
              </div>
            </div>

            {/* Card 5: Vomiting */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5DDD0] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 rounded-full bg-[#E0EFEA] flex items-center justify-center text-[#0B6B6B] mb-4">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-[#0B6B6B]"
                  >
                    <path d="M4.5 12c1.6-2.5 3.2-2.5 4.8 0s3.2 2.5 4.8 0 3.2-2.5 4.8 0" />
                  </svg>
                </div>
                <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-2 leading-snug">
                  Vomiting
                </h3>
                <p className="text-sm text-[#4E5E5C] leading-relaxed">
                  Nausea gives the feeling of being sick to your stomach or needing to throw up.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. THE AYURVEDIC PHILOSOPHY (Featuring img1.jpeg) ================= */}
      <section id="about" className="scroll-mt-[calc(var(--app-header-h,120px)+20px)] py-16 sm:py-24 bg-[#FAF8F2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Column: Text & Synergies */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#172B2A] leading-tight">
                The Ayurvedic philosophy behind Bhramananthu Oil
              </h2>
              <p className="text-[#2D3E3C] text-base sm:text-lg leading-relaxed">
                In Ayurveda, vertigo (Bhrama) arises from an imbalance in Vata and Pitta doshas, affecting the brain and nervous system.
              </p>
              <p className="text-[#2D3E3C] text-base sm:text-lg leading-relaxed">
                Prepared according to the Tailapaka vidhi, Bhramananthu Oil blends neuroprotective, adaptogenic and rejuvenating herbs to restore harmony between the doshas, supporting mental clarity, calmness and balance.
              </p>
              
              <div className="pt-2">
                <h3 className="text-lg font-bold text-[#172B2A] mb-4">
                  This synergy of herbs:
                </h3>
                <ul className="space-y-3.5">
                  {[
                    "Calms the nervous system",
                    "Improves blood circulation to the brain and inner ear",
                    "Reduces inflammation and stress",
                    "Enhances equilibrium naturally",
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-base text-[#1E2827] font-medium">
                      <div className="w-6 h-6 rounded-full bg-[#0B6B6B] flex items-center justify-center shrink-0 text-white">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column: Symptoms Infographic Image */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-lg border border-[#E2D9CC] bg-[#008B8B]/10">
                <img
                  src={symptomsInfographic}
                  alt="Ayurvedic relief indications for vertigo, tinnitus, and ear imbalance"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. INGREDIENTS SECTION (Featuring img.jpeg + 14 Herbs Grid) ================= */}
      <section id="ingredients" className="scroll-mt-[calc(var(--app-header-h,120px)+20px)] py-16 sm:py-24 bg-[#F6EFE5] border-t border-[#E8DFC8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Hero: Infographic (Left) + Text (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center mb-16">
            {/* Left: 14 Herbs Infographic */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-lg border border-[#E2D9CC] bg-[#008B8B]">
                <img
                  src={herbsInfographic}
                  alt="14 Ayurvedic herbs in Bhramananthu Oil"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            {/* Right: Text Description */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#172B2A] leading-tight">
                Ingredients of Bhramananthu Oil
              </h2>
              <p className="text-[#2D3E3C] text-base sm:text-lg leading-relaxed">
                A unique Ayurvedic formulation crafted from time-tested herbs that work synergistically to help manage vertigo, ear imbalance, inner ear disorders, dizziness and tinnitus.
              </p>
              <p className="text-[#2D3E3C] text-base sm:text-lg leading-relaxed">
                Each ingredient has been carefully chosen to balance Vata and Pitta doshas, promote nervous system stability, and support inner ear health naturally.
              </p>
            </div>
          </div>

          {/* Botanical Breakdown Cards (14 Herbs Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {herbsList.map((herb, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2D9CC] shadow-xs flex flex-col justify-between hover:border-[#0B6B6B]/40 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-lg text-[#172B2A]">
                    {herb.name}
                  </h3>
                  <p className="text-xs sm:text-sm italic text-[#556966] mb-2 font-serif">
                    {herb.botanical}
                  </p>
                  <p className="text-xs sm:text-sm text-[#2D3E3C] leading-relaxed">
                    <strong className="font-bold text-[#172B2A]">Key benefits: </strong>
                    {herb.benefits}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 4. DIRECTIONS TO USE ================= */}
      <section id="how-to-use" className="scroll-mt-[calc(var(--app-header-h,120px)+20px)] py-16 sm:py-24 bg-[#FAF8F2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-left">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#172B2A] tracking-tight">
              Directions to use
            </h2>
            <p className="text-[#4A5A58] text-base sm:text-lg mt-2">
              Use once a day. For people with sleep-related problems, using the oil at bedtime is especially beneficial.
            </p>
          </div>

          {/* 4 Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-[#E2D9CC] shadow-xs">
              <span className="text-xs font-bold text-[#0B6B6B] uppercase tracking-wider block mb-2">Step 1</span>
              <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-2">Apply 15 drops</h3>
              <p className="text-sm text-[#4E5E5C] leading-relaxed">
                Apply 15 drops of Bhramananthu Oil on the apex (top) of the head.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2D9CC] shadow-xs">
              <span className="text-xs font-bold text-[#0B6B6B] uppercase tracking-wider block mb-2">Step 2</span>
              <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-2">Wait 15 minutes</h3>
              <p className="text-sm text-[#4E5E5C] leading-relaxed">
                Leave the oil on for 10 to 15 minutes.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2D9CC] shadow-xs">
              <span className="text-xs font-bold text-[#0B6B6B] uppercase tracking-wider block mb-2">Step 3</span>
              <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-2">Wash or wipe off</h3>
              <p className="text-sm text-[#4E5E5C] leading-relaxed">
                Take a head bath, or wipe off the oil completely using cotton.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#E2D9CC] shadow-xs">
              <span className="text-xs font-bold text-[#0B6B6B] uppercase tracking-wider block mb-2">Step 4</span>
              <h3 className="font-serif font-bold text-lg text-[#172B2A] mb-2">Best time to use</h3>
              <p className="text-sm text-[#4E5E5C] leading-relaxed">
                After 4 pm, or at night before going to bed.
              </p>
            </div>
          </div>

          {/* Malayalam Instructions Box */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2D9CC] shadow-xs mb-6">
            <h3 className="font-bold text-lg sm:text-xl text-[#172B2A] mb-4">
              ഭ്രമണാന്തു ഓയിൽ ഉപയോഗിക്കുന്ന വിധം
            </h3>
            <ol className="list-decimal pl-5 space-y-2.5 text-sm sm:text-base text-[#2E3F3D] leading-relaxed">
              <li>15 തുള്ളി ഓയിൽ തലയുടെ നെറുകയിൽ (ഉച്ചിയിൽ) പുരട്ടുക.</li>
              <li>10–15 മിനിറ്റ് കഴിഞ്ഞ് തുണിയാൽ തുടച്ച് കളയുക അഥവാ സോപ്പ്/ഷാംപു ഉപയോഗിച്ച് തല കഴുകുക.</li>
              <li>ഉപയോഗിക്കാൻ ഏറ്റവും അനുയോജ്യമായ സമയം: വൈകുന്നേരം 4 മണിക്ക് ശേഷം അല്ലെങ്കിൽ രാത്രിയിൽ കിടക്കുന്നതിന് മുൻപ്.</li>
              <li>ദിവസത്തിൽ ഒരിക്കൽ ഇങ്ങനെ ഉപയോഗിക്കാം.</li>
            </ol>
          </div>

          {/* Disclaimer Banner */}
          <div className="bg-[#FAF2DF] border border-[#E5DAC3] rounded-xl px-5 py-3 text-center text-sm font-semibold text-[#665427]">
            For external use only, as directed by an Ayurvedic practitioner.
          </div>
        </div>
      </section>

      {/* ================= 5. PHARMACY SHOWCASE BANNER ================= */}
      <section className="bg-[#0B5858] text-white py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight mb-2">
              Panakkal Ayurveda Pharmacy
            </h2>
            <p className="text-[#C1E2DC] text-base sm:text-lg">
              Vilanganur, Peechi, Thrissur, Kerala.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="border-t border-[#3B8080] pt-4">
              <h3 className="font-bold text-lg mb-2 text-white">Since 1996</h3>
              <p className="text-sm text-[#D7ECE8] leading-relaxed">
                Panakkal Ayurveda Pharmacy, Thrissur, has been making Ayurvedic medicines for nearly 30 years.
              </p>
            </div>

            <div className="border-t border-[#3B8080] pt-4">
              <h3 className="font-bold text-lg mb-2 text-white">Tailapaka vidhi</h3>
              <p className="text-sm text-[#D7ECE8] leading-relaxed">
                Prepared by the classical Ayurvedic method of making medicated oils.
              </p>
            </div>

            <div className="border-t border-[#3B8080] pt-4">
              <h3 className="font-bold text-lg mb-2 text-white">Hygienic dropper bottle</h3>
              <p className="text-sm text-[#D7ECE8] leading-relaxed">
                20 ml bottle for easy and precise application of the drops.
              </p>
            </div>

            <div className="border-t border-[#3B8080] pt-4">
              <h3 className="font-bold text-lg mb-2 text-white">Talk to us first</h3>
              <p className="text-sm text-[#D7ECE8] leading-relaxed">
                Unsure if it suits you? Call <span className="whitespace-nowrap"><a href="tel:+919995579398" className="underline hover:text-white font-bold">+91 99955 79398</a></span> / <span className="whitespace-nowrap"><a href="tel:+914872699398" className="underline hover:text-white font-bold">+91 487 2699398</a></span> before you buy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. CUSTOMER VIDEO REVIEWS & EXPERIENCES ================= */}
      <CustomerVideoReviews />

      {/* ================= 7. CUSTOMER TEXT REVIEWS & RATINGS ================= */}
      {product && (
        <ProductReviews
          productId={product.id}
          productName={product.name || categoryDisplayName}
          activeVariantId={activePack?.variantId}
          onRatingUpdate={setProductRating}
        />
      )}

      {/* ================= 7. FREQUENTLY ASKED QUESTIONS ================= */}
      <section id="faqs" className="scroll-mt-[calc(var(--app-header-h,120px)+20px)] py-16 sm:py-24 bg-[#F6EFE5] border-t border-[#E8DFC8]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-left">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#172B2A] tracking-tight">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3.5">
            {faqList.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-[#E2D9CC] overflow-hidden shadow-xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    <span className="font-bold text-base sm:text-lg text-[#172B2A]">
                      {faq.question}
                    </span>
                    <span className="w-8 h-8 rounded-full bg-[#EAF5F3] flex items-center justify-center shrink-0 text-[#0B6B6B]">
                      {isOpen ? (
                        <Minus className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-sm sm:text-base text-[#3E504E] leading-relaxed border-t border-[#F2ECE2]">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 7. REACH OUT SECTION ================= */}
      <section id="contact" className="scroll-mt-[calc(var(--app-header-h,120px)+20px)] py-16 sm:py-20 bg-[#FAF8F2] border-t border-[#E5DFD5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-left">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#172B2A] tracking-tight">
              Have inquiries? Reach out to us!
            </h2>
            <p className="text-[#4A5A58] text-base sm:text-lg mt-2">
              We are happy to take your order over the phone.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: WhatsApp */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2D9CC] shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#667775] mb-2">Call or WhatsApp</p>
                <a
                  href="tel:+917593875934"
                  className="font-serif font-bold text-xl sm:text-2xl text-[#172B2A] hover:text-[#0B6B6B] transition-colors block mb-3"
                >
                  +91 75938 75934
                </a>
              </div>
              <a
                href="https://wa.me/917593875934?text=Hello%20Panakkal%20Ayurveda%20Pharmacy,%20I%20have%20an%20inquiry%20about%20Bhramananthu"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#0B6B6B] hover:text-[#085555] transition-colors group"
              >
                <svg className="w-4.5 h-4.5 fill-[#25D366]" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.821 11.821 0 018.413 3.483 11.82 11.82 0 013.48 8.41c-.003 6.558-5.339 11.893-11.893 11.893h-.005a11.882 11.882 0 01-5.683-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.884a9.825 9.825 0 00-2.893-6.994 9.82 9.82 0 00-6.988-2.898c-5.452 0-9.887 4.434-9.888 9.884 0 1.944.57 3.824 1.636 5.488l-1.074 3.923 3.93-1.111zM17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
                <span>Chat on WhatsApp →</span>
              </a>
            </div>

            {/* Card 2: Landline */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2D9CC] shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#667775] mb-2">Pharmacy landline</p>
                <a
                  href="tel:+914872699398"
                  className="font-serif font-bold text-xl sm:text-2xl text-[#172B2A] hover:text-[#0B6B6B] transition-colors"
                >
                  +91 487 2699398
                </a>
              </div>
            </div>

            {/* Card 3: Email */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2D9CC] shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#667775] mb-2">Email</p>
                <a
                  href="mailto:info@bhramananthu.com"
                  className="font-serif font-bold text-lg sm:text-xl text-[#172B2A] hover:text-[#0B6B6B] transition-colors break-all"
                >
                  info@bhramananthu.com
                </a>
              </div>
            </div>

            {/* Card 4: Address */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2D9CC] shadow-xs flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#667775] mb-2">Address</p>
                <p className="text-xs sm:text-sm text-[#2D3E3C] leading-relaxed">
                  Panakkal Ayurveda Pharmacy, Vilanganur, Peechi P.O, Thrissur – 680653, Kerala, India
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 8. DEDICATED BHRAMANANTHU FOOTER ================= */}
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
                Manufactured & Marketed by Panakkal Ayurveda Pharmacy, Thrissur.
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
                    onClick={() => {
                      const imageSection =
                        document.getElementById("product-image-section") ||
                        document.getElementById("product-hero");
                      if (imageSection) {
                        imageSection.scrollIntoView({ behavior: "smooth", block: "start" });
                      } else {
                        const scrollContainer =
                          document.querySelector(".overflow-y-auto") ||
                          document.documentElement ||
                          document.body;
                        scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Buy Bhramananthu Oil
                  </button>
                </li>
                <li>
                  <a href="#how-to-use" className="hover:text-white transition-colors">
                    Directions to use
                  </a>
                </li>
                <li>
                  <a href="#ingredients" className="hover:text-white transition-colors">
                    Ingredients
                  </a>
                </li>
                <li>
                  <a href="#reviews" className="hover:text-white transition-colors">
                    Reviews
                  </a>
                </li>
                <li>
                  <a href="#faqs" className="hover:text-white transition-colors">
                    FAQs
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Help & Policies */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="font-bold text-base text-white tracking-wide">Help</h4>
              <ul className="space-y-2 text-sm text-[#A2B8B4]">
                <li>
                  <a href="#contact" className="hover:text-white transition-colors">
                    Contact us
                  </a>
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
                    href="https://www.instagram.com/panakkal_ayurveda_pharmacy?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw=="
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

      {/* Mobile Floating Sticky Bottom Bar - Smart Auto-Hide when inline buy section is in view or hamburger menu is open */}
      {product && !loading &&
        createPortal(
          <div
            className={`fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F2] border-t border-[#E6DFD5] rounded-t-2xl xs:rounded-t-3xl px-4 pt-3.5 pb-5.5 xs:pb-6.5 shadow-[0_-8px_30px_rgba(0,0,0,0.14)] lg:hidden transition-all duration-300 ease-in-out ${
              showFloatingBar && !isMobileMenuOpen
                ? "translate-y-0 opacity-100 pointer-events-auto"
                : "translate-y-full opacity-0 pointer-events-none"
            }`}
          >
            <div className="max-w-md mx-auto flex items-center justify-between gap-3">
              {/* Buy Now Button (First) */}
              <button
                type="button"
                onClick={handleFloatingBuyNow}
                className="flex-1 h-12 bg-[#0B6B6B] hover:bg-[#085555] active:scale-[0.98] text-white font-bold text-sm xs:text-base rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Buy now"
              >
                <span>Buy now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Cart Button: "Go to cart" with count if already in cart, otherwise "Add to cart" */}
              {isSelectedPackInCart ? (
                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  className="flex-1 h-12 bg-white border-2 border-[#0B6B6B] hover:bg-[#0B6B6B]/5 active:scale-[0.98] text-[#0B6B6B] font-bold text-sm xs:text-base rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-transform whitespace-nowrap"
                  title="Go to cart"
                  aria-label="Go to cart"
                >
                  <ShoppingBag className="w-4.5 h-4.5 stroke-[2.2]" />
                  <span>Go to cart</span>
                  <span className="text-[11px] bg-[#0B6B6B]/10 text-[#0B6B6B] px-1.5 py-0.5 rounded-full font-bold">
                    {activePackCartItem?.quantity}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAdding || isOutOfStock}
                  className="flex-1 h-12 bg-white border-2 border-[#0B6B6B] hover:bg-[#0B6B6B]/5 active:scale-[0.98] text-[#0B6B6B] font-bold text-sm xs:text-base rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-transform whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add to cart"
                  aria-label="Add to cart"
                >
                  {isAdding ? (
                    <BeatLoader size={5} color="#0B6B6B" />
                  ) : (
                    <>
                      <ShoppingBag className="w-4.5 h-4.5 stroke-[2.2]" />
                      <span>Add to cart</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Floating WhatsApp Quick Chat Button */}
      {createPortal(
        <a
          href="https://wa.me/917593875934?text=Hello%20Panakkal%20Ayurveda%20Pharmacy,%20I%20have%20an%20inquiry%20about%20Bhramananthu"
          target="_blank"
          rel="noreferrer"
          className={`fixed bottom-26 sm:bottom-28 lg:bottom-6 right-4 sm:right-6 z-30 bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white w-11 h-11 sm:w-12 sm:h-12 rounded-full shadow-[0_3px_14px_rgba(37,211,102,0.35)] hover:shadow-[0_5px_18px_rgba(37,211,102,0.45)] transition-all hover:scale-105 flex items-center justify-center group ${
            isMobileMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
          }`}
          title="Chat with us on WhatsApp"
          aria-label="Chat with us on WhatsApp"
        >
          <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-white" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.821 11.821 0 018.413 3.483 11.82 11.82 0 013.48 8.41c-.003 6.558-5.339 11.893-11.893 11.893h-.005a11.882 11.882 0 01-5.683-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.882-4.434 9.885-9.884a9.825 9.825 0 00-2.893-6.994 9.82 9.82 0 00-6.988-2.898c-5.452 0-9.887 4.434-9.888 9.884 0 1.944.57 3.824 1.636 5.488l-1.074 3.923 3.93-1.111zM17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          </svg>
        </a>,
        document.body
      )}

      {/* Buy Now Delivery Location Modal */}
      {product && (
        <DeliveryLocationModal
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          product={{
            id: product.id,
            name: product.name,
            price: unitPrice,
            quantity: activePack.variantId ? quantity : activePack.packCount * quantity,
            variantId: activePack.variantId,
          }}
        />
      )}
    </div>
  );
}
