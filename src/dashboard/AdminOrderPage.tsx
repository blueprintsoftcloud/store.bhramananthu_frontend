import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import toast from "react-hot-toast";
import { stripHtml } from "../utils/sanitizeHtml";
import { fetchPincodeDetails } from "../utils/pincodeLookup";
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  UserPlusIcon,
  ShoppingCartIcon,
  MapPinIcon,
  CreditCardIcon,
  CheckCircleIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  MinusIcon,
  DocumentTextIcon,
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
  XMarkIcon,
  TicketIcon,
  HomeIcon,
  BuildingOffice2Icon,
  MapIcon,
  HashtagIcon,
  GlobeAmericasIcon,
  SparklesIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import ShipOrderModal, { ShipOrderPayload } from "./ShipOrderModal";

interface RecentOrderInfo {
  id: string;
  shortId: string;
  createdAt: string;
  formattedTime: string;
  relativeTime: string;
  finalAmount: number;
  totalAmount?: number;
  orderStatus: string;
  paymentMethod: string;
  placedByAdmin: boolean;
  itemsCount: number;
  itemsSummary: string;
  customerName: string;
}

interface Customer {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  recentAddress?: Address | null;
}

interface ProductVariant {
  id: string;
  options: Record<string, string>;
  stock: number;
  priceOverride: number | null;
  discountOverride?: number | null;
  image?: string | null;
  secondaryImage?: string | null;
  images?: string[];
}

interface Product {
  id: string;
  name: string;
  code: string;
  image?: string;
  description?: string;
  price: number;
  stock: number;
  category?: { id: string; name: string };
  /** Active option combinations (Storage/Color, Weight, ...) this product is sold
   * in — see backend's ProductVariant. Empty for a plain single-SKU product. A
   * product with any entries here can't be added without picking one, same rule
   * the storefront's own add-to-cart already enforces (cart.controller.ts's cartAdd). */
  variants?: ProductVariant[];
}

interface CartItem {
  product: Product;
  variantId?: string | null;
  variantOptions?: Record<string, string> | null;
  /** Snapshot of the effective unit price at the moment this line was added —
   * either the picked variant's priceOverride or the product's own price. Stored
   * here (not recomputed from `products`) because the product list can page/search
   * away from what's already in the cart. */
  unitPrice: number;
  /** Stock ceiling for the quantity stepper — the variant's own stock once one is
   * picked (Product.stock is meaningless for a variant product), else the product's. */
  maxStock: number;
  quantity: number;
}

interface Address {
  fullAddress: string;
  locality?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  secondaryPhone?: string;
}

interface AppliedCoupon {
  couponId: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  discountAmount: number;
}

type PaymentMethod = "CASH" | "POD";

type Step = "customer" | "products" | "address" | "payment" | "confirm";

const STEPS: { id: Step; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { id: "customer", label: "Customer", icon: UserCircleIcon },
  { id: "products", label: "Products", icon: ShoppingCartIcon },
  { id: "address", label: "Address", icon: MapPinIcon },
  { id: "payment", label: "Payment", icon: CreditCardIcon },
  { id: "confirm", label: "Confirm", icon: CheckCircleIcon },
];

const STEP_ORDER: Step[] = ["customer", "products", "address", "payment", "confirm"];

// ─── Customer avatar / match-highlight helpers ──────────────────────────────
const AVATAR_PALETTE = [
  "bg-indigo-100 text-indigo-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
];

const avatarClass = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

const CustomerAvatar = ({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) => (
  <div
    className={`shrink-0 rounded-full flex items-center justify-center font-bold ${avatarClass(name)} ${
      size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs"
    }`}
  >
    {name.trim().charAt(0).toUpperCase() || "?"}
  </div>
);

const HighlightMatch = ({ text, query }: { text: string; query: string }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-indigo-100 text-indigo-700 rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
};



const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand",
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal"
];

// ─── Format Variant Options Label ───────────────────────────────────────────
const formatVariantLabel = (options?: Record<string, string> | null) => {
  if (!options) return "Default Option";
  const entries = Object.entries(options);
  if (entries.length === 0) return "Default Option";
  return entries.map(([k, val]) => `${k}: ${val}`).join(" / ");
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AdminOrderPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>("customer");
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{ id: string; orderNumber?: string } | null>(null);

  // ── Post-order actions (invoice / ship) ──
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [shipSubmitting, setShipSubmitting] = useState(false);
  const [shippedInfo, setShippedInfo] = useState<{ deliveryPartnerName?: string; trackingId?: string } | null>(null);

  // ── Customer state ──
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ username: "", phone: "", email: "" });

  // ── Duplicate customer detection & conflict modal state ──
  const [conflictCustomer, setConflictCustomer] = useState<Customer | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictSubmitting, setConflictSubmitting] = useState(false);
  const [conflictReason, setConflictReason] = useState("");
  const [conflictTriggerSource, setConflictTriggerSource] = useState<"step1_next" | "place_order">("place_order");
  const [inlineMatchedCustomer, setInlineMatchedCustomer] = useState<Customer | null>(null);
  const checkNewCustomerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 24-hour recent order detection state ──
  const [recentOrderWarning, setRecentOrderWarning] = useState<RecentOrderInfo | null>(null);
  const [recentOrderModalOpen, setRecentOrderModalOpen] = useState(false);
  const [recentOrderChecking, setRecentOrderChecking] = useState(false);
  const [bypassRecentOrder, setBypassRecentOrder] = useState(false);

  // ── Products state ──
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  // Which variant is currently picked in each variant product's row — a draft choice
  // in the picker, separate from what's actually in the cart (see CartItem above).
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const productSearchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Coupon state ──
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // ── Address state ──
  const [address, setAddress] = useState<Address>({
    fullAddress: "",
    locality: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    secondaryPhone: "",
  });
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateFilter, setStateFilter] = useState("");
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  // ── Post office / locality selection state ──
  const [availableLocalities, setAvailableLocalities] = useState<string[]>([]);
  const [localityDropdownOpen, setLocalityDropdownOpen] = useState(false);
  const [localityFilter, setLocalityFilter] = useState("");
  const localityDropdownRef = useRef<HTMLDivElement>(null);

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const pincodeLookupAbortRef = useRef<AbortController | null>(null);
  const addressTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize address textarea so long addresses wrap and expand height without scrolling
  useEffect(() => {
    if (addressTextareaRef.current) {
      addressTextareaRef.current.style.height = "auto";
      const scrollH = addressTextareaRef.current.scrollHeight;
      addressTextareaRef.current.style.height = `${Math.max(72, scrollH)}px`;
    }
  }, [address.fullAddress, currentStep]);

  const handlePincodeChange = async (val: string) => {
    const cleanPincode = val.replace(/\D/g, "").slice(0, 6);
    setAddress(prev => ({ ...prev, zipCode: cleanPincode }));

    if (pincodeLookupAbortRef.current) {
      pincodeLookupAbortRef.current.abort();
    }

    if (cleanPincode.length < 6) {
      setAvailableLocalities([]);
      setLocalityDropdownOpen(false);
      setAddress(prev => ({ ...prev, locality: "" }));
      return;
    }

    if (cleanPincode.length === 6) {
      const abortController = new AbortController();
      pincodeLookupAbortRef.current = abortController;
      setPincodeLoading(true);

      try {
        // 1. Direct Postal PIN code lookup (queries official postal records for localities, city, and state)
        let resolved = false;
        try {
          const result = await fetchPincodeDetails(cleanPincode);
          if (result.success) {
            resolved = true;
            const autoLocality = result.localities.length === 1 ? result.localities[0] : "";
            const rawState = result.state || "";
            const matchedState = INDIAN_STATES.find(
              s => s.toLowerCase() === rawState.trim().toLowerCase()
            ) || INDIAN_STATES.find(
              s => s.toLowerCase().includes(rawState.trim().toLowerCase()) || rawState.trim().toLowerCase().includes(s.toLowerCase())
            ) || rawState;

            setAddress(prev => ({
              ...prev,
              city: result.city || prev.city,
              state: matchedState || prev.state,
              locality: autoLocality || prev.locality || "",
            }));
            setAvailableLocalities(result.localities);

            if (result.localities.length === 1) {
              setLocalityDropdownOpen(false);
              toast.success(`Location detected: ${result.localities[0]}, ${result.city}${matchedState ? `, ${matchedState}` : ""}`);
            } else if (result.localities.length > 1) {
              setLocalityDropdownOpen(true);
              toast.success(`Resolved ${result.localities.length} post offices under ${result.city}. Select post office.`);
            }
          }
        } catch {
          // Continue to backend fallback
        }

        if (resolved) {
          setPincodeLoading(false);
          return;
        }

        // 2. Query through backend lookup endpoint
        const { data } = await api.get(`/order/admin-order/lookup-pincode/${cleanPincode}`, {
          signal: abortController.signal,
          timeout: 6000,
        });

        if (data && data.success) {
          const fetchedCity = data.city || data.district || "";
          const rawState = data.state || "";
          const matchedState = INDIAN_STATES.find(
            s => s.toLowerCase() === rawState.trim().toLowerCase()
          ) || INDIAN_STATES.find(
            s => s.toLowerCase().includes(rawState.trim().toLowerCase()) || rawState.trim().toLowerCase().includes(s.toLowerCase())
          ) || rawState;
          const locs: string[] = Array.isArray(data.localities) ? data.localities : [];

          setAddress(prev => ({
            ...prev,
            city: fetchedCity || prev.city,
            state: matchedState || prev.state,
            locality: locs.length === 1 ? locs[0] : prev.locality || "",
          }));
          setAvailableLocalities(locs);
          if (locs.length > 1) {
            setLocalityDropdownOpen(true);
          }
          toast.success(`Location detected: ${fetchedCity}${matchedState ? `, ${matchedState}` : ""}`);
        } else {
          toast.error("Location not found for this PIN code");
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError" || err?.code === "ERR_CANCELED") {
          return;
        }

        // Secondary: Quick fallback to zippopotam if backend route failed
        try {
          const zipRes = await fetch(`https://api.zippopotam.us/in/${cleanPincode}`, {
            signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
          });
          if (zipRes.ok) {
            const zipData = await zipRes.json();
            if (zipData?.places?.[0]) {
              const place = zipData.places[0];
              const fetchedCity = place["place name"] || "";
              const rawState = place.state || "";
              const matchedState = INDIAN_STATES.find(
                s => s.toLowerCase() === rawState.trim().toLowerCase()
              ) || rawState;
              setAddress(prev => ({
                ...prev,
                city: fetchedCity || prev.city,
                state: matchedState || prev.state,
              }));
              toast.success(`Location detected: ${fetchedCity}${matchedState ? `, ${matchedState}` : ""}`);
              return;
            }
          }
        } catch {
          // ignore fallback error
        }

        toast.error(err?.response?.data?.message ?? "Unable to auto-detect location. Please enter manually.");
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleClearPincode = () => {
    if (pincodeLookupAbortRef.current) {
      pincodeLookupAbortRef.current.abort();
    }
    setPincodeLoading(false);
    setAvailableLocalities([]);
    setLocalityDropdownOpen(false);
    setAddress(p => ({ ...p, zipCode: "", locality: "" }));
  };

  // ── Payment state ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("POD");
  const [paymentNote, setPaymentNote] = useState("");

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setNewCustomer({ username: "", phone: "", email: "" });
    setInlineMatchedCustomer(null);

    // Auto-fill recent ordered address if available
    if (c.recentAddress && c.recentAddress.fullAddress) {
      const recentLocality = c.recentAddress.locality || "";
      const recentPin = c.recentAddress.zipCode || "";
      setAddress({
        fullAddress: c.recentAddress.fullAddress || "",
        locality: recentLocality,
        city: c.recentAddress.city || "",
        state: c.recentAddress.state || "",
        zipCode: recentPin,
        country: c.recentAddress.country || "India",
        secondaryPhone: c.recentAddress.secondaryPhone || "",
      });

      if (recentLocality) {
        setAvailableLocalities([recentLocality]);
      } else if (recentPin && recentPin.length === 6) {
        // If older order didn't have locality field stored, resolve post offices for this pincode
        fetchPincodeDetails(recentPin).then((res) => {
          if (res.success && res.localities.length > 0) {
            setAvailableLocalities(res.localities);
            const fullLower = (c.recentAddress?.fullAddress || "").toLowerCase();
            const matchedLoc = res.localities.find((loc) => fullLower.includes(loc.toLowerCase()));
            if (matchedLoc) {
              setAddress((p) => ({ ...p, locality: matchedLoc }));
            } else if (res.localities.length === 1) {
              setAddress((p) => ({ ...p, locality: res.localities[0] }));
            }
          }
        }).catch(() => {});
      }
      toast.success(`Auto-filled address from ${c.username}'s previous order!`, { id: "customer-address-autofill" });
    }
  };

  const handlePhoneChange = (val: string) => {
    // Strip non-digits and strictly limit to 10 digits
    let digits = val.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2);
    } else if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }
    setNewCustomer((p) => ({ ...p, phone: digits }));
  };

  const isNewCustomerPhoneValid = /^[6-9]\d{9}$/.test(newCustomer.phone.trim());
  const isNewCustomerEmailValid = !newCustomer.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email.trim());

  // ── Auto-check if entered phone or email matches an existing customer ──
  useEffect(() => {
    if (selectedCustomer) {
      setInlineMatchedCustomer(null);
      return;
    }
    const cleanPhone = newCustomer.phone.trim();
    const cleanEmail = newCustomer.email.trim();

    if (cleanPhone.length < 5 && (!cleanEmail || !cleanEmail.includes("@"))) {
      setInlineMatchedCustomer(null);
      return;
    }

    if (checkNewCustomerDebounce.current) {
      clearTimeout(checkNewCustomerDebounce.current);
    }

    checkNewCustomerDebounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/order/admin-order/check-customer", {
          params: {
            ...(cleanPhone.length >= 5 ? { phone: cleanPhone } : {}),
            ...(cleanEmail.includes("@") ? { email: cleanEmail } : {}),
          },
        });
        if (data && data.exists && data.customer) {
          setInlineMatchedCustomer(data.customer);
        } else {
          setInlineMatchedCustomer(null);
        }
      } catch {
        // silent
      }
    }, 350);

    return () => {
      if (checkNewCustomerDebounce.current) clearTimeout(checkNewCustomerDebounce.current);
    };
  }, [selectedCustomer, newCustomer.phone, newCustomer.email]);

  // Reset bypass status and recent warning whenever customer changes
  useEffect(() => {
    setBypassRecentOrder(false);
    setRecentOrderWarning(null);
  }, [selectedCustomer?.id, newCustomer.phone, newCustomer.email]);

  // Check for recent order in the last 24h when reaching the Confirm step
  useEffect(() => {
    if (currentStep !== "confirm" || bypassRecentOrder) return;
    const params: Record<string, string> = {};
    if (selectedCustomer?.id) {
      params.customerId = selectedCustomer.id;
    } else if (newCustomer.phone.trim()) {
      params.phone = newCustomer.phone.trim();
    } else if (newCustomer.email.trim()) {
      params.email = newCustomer.email.trim();
    }
    if (Object.keys(params).length === 0) return;

    api.get("/order/admin-order/check-recent-order", { params })
      .then(({ data }) => {
        if (data && data.hasRecentOrder && data.order) {
          setRecentOrderWarning(data.order);
        } else {
          setRecentOrderWarning(null);
        }
      })
      .catch(() => {
        // silent
      });
  }, [currentStep, selectedCustomer?.id, newCustomer.phone, newCustomer.email, bypassRecentOrder]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) {
        setStateDropdownOpen(false);
      }
      if (localityDropdownRef.current && !localityDropdownRef.current.contains(e.target as Node)) {
        setLocalityDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Track whether initial products load has occurred so step navigation never re-triggers or flickers
  const productsFetchedRef = useRef(false);

  // ─── Product fetch ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (search: string, page: number) => {
    setProductsLoading(true);
    try {
      const { data } = await api.get("/order/admin-order/products", { params: { search, page, limit: 10 } });
      setProducts(data.products ?? []);
      setProductTotalPages(data.pagination?.totalPages ?? 1);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Pre-fetch products on mount so they are instantly ready when entering the products step
  useEffect(() => {
    if (!productsFetchedRef.current) {
      productsFetchedRef.current = true;
      fetchProducts("", 1);
    }
  }, [fetchProducts]);

  // Fallback: if user reaches products step and products haven't been fetched yet
  useEffect(() => {
    if (currentStep === "products" && !productsFetchedRef.current) {
      productsFetchedRef.current = true;
      fetchProducts(productSearch, productPage);
    }
  }, [currentStep, productSearch, productPage, fetchProducts]);

  const handleProductSearch = (val: string) => {
    setProductSearch(val);
    if (productSearchDebounce.current) clearTimeout(productSearchDebounce.current);
    productSearchDebounce.current = setTimeout(() => {
      setProductPage(1);
      fetchProducts(val, 1);
    }, 350);
  };

  const handleProductPageChange = (newPage: number) => {
    setProductPage(newPage);
    fetchProducts(productSearch, newPage);
  };

  // ─── Cart helpers ─────────────────────────────────────────────────────────
  // A cart line is identified by (productId, variantId) — two different options of
  // the same product (e.g. 128GB vs 256GB) are separate lines, not merged into one,
  // same rule the storefront cart already follows (CartContext.tsx).
  const findCartLine = (productId: string, variantId?: string | null) =>
    cart.find(c => c.product.id === productId && String(c.variantId ?? "") === String(variantId ?? ""));

  const addToCart = (product: Product, variantId?: string | null) => {
    const hasVariants = (product.variants?.length ?? 0) > 0;
    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined;
    if (hasVariants && !variant) {
      toast.error(`Select an option for "${product.name}" first`, { id: "admin-order-pick-variant" });
      return;
    }
    const unitPrice = variant?.priceOverride ?? product.price;
    const maxStock = variant ? variant.stock : product.stock;
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id && String(c.variantId ?? "") === String(variantId ?? ""));
      if (existing) {
        return prev.map(c =>
          c === existing ? { ...c, quantity: Math.min(c.quantity + 1, maxStock) } : c,
        );
      }
      return [
        ...prev,
        { product, variantId: variant?.id ?? null, variantOptions: variant?.options ?? null, unitPrice, maxStock, quantity: 1 },
      ];
    });
  };

  const updateQty = (productId: string, variantId: string | null | undefined, qty: number, maxStock: number) => {
    if (qty < 1) { removeFromCart(productId, variantId); return; }
    setCart(prev =>
      prev.map(c =>
        c.product.id === productId && String(c.variantId ?? "") === String(variantId ?? "")
          ? { ...c, quantity: Math.min(qty, maxStock) }
          : c,
      ),
    );
  };

  const removeFromCart = (productId: string, variantId?: string | null) => {
    setCart(prev => prev.filter(c => !(c.product.id === productId && String(c.variantId ?? "") === String(variantId ?? ""))));
    setSelectedVariantByProduct(prev => {
      if (prev[productId]) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return prev;
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
  const orderTotal = Math.max(cartTotal - (appliedCoupon?.discountAmount ?? 0), 0);

  // A coupon's discount was computed against the subtotal at the moment it was applied —
  // if the cart changes afterwards that preview is stale, so drop it and make the admin
  // re-apply. The backend re-validates independently at final submission regardless.
  useEffect(() => {
    setAppliedCoupon(null);
  }, [cart]);

  // ─── Coupon ───────────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    try {
      const { data } = await api.post("/coupon/validate", { code, orderAmount: cartTotal });
      setAppliedCoupon({
        couponId: data.couponId,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount: data.discountAmount,
      });
      toast.success(
        data.discountType === "PERCENTAGE"
          ? `Coupon applied: ${data.discountValue}% off`
          : `Coupon applied: ₹${data.discountAmount.toLocaleString("en-IN")} off`
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Invalid or expired coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  // ─── Validation helpers ───────────────────────────────────────────────────
  const canProceed = (): boolean => {
    if (currentStep === "customer") {
      if (selectedCustomer) return true;
      return !!(newCustomer.username.trim() && isNewCustomerPhoneValid && isNewCustomerEmailValid);
    }
    if (currentStep === "products") return cart.length > 0;
    if (currentStep === "address") {
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (currentStep === "customer" && !selectedCustomer) {
      if (!newCustomer.username.trim()) {
        toast.error("Please enter customer name");
        return;
      }
      if (!newCustomer.phone.trim()) {
        toast.error("Please enter mobile number");
        return;
      }
      if (newCustomer.phone.length !== 10) {
        toast.error("Mobile number must be exactly 10 digits");
        return;
      }
      if (!/^[6-9]\d{9}$/.test(newCustomer.phone.trim())) {
        toast.error("Please enter a valid Indian mobile number (starts with 6–9)");
        return;
      }
      if (newCustomer.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomer.email.trim())) {
        toast.error("Please enter a valid email address");
        return;
      }
      if (inlineMatchedCustomer) {
        setConflictCustomer(inlineMatchedCustomer);
        setConflictReason("This phone number or email is already registered to an existing customer.");
        setConflictTriggerSource("step1_next");
        setConflictModalOpen(true);
        return;
      }
    }
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) setCurrentStep(STEP_ORDER[idx + 1]);
  };

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEP_ORDER[idx - 1]);
  };

  // ─── Place order ──────────────────────────────────────────────────────────
  const handlePlaceOrder = async (bypassWarning = false) => {
    // If not bypassing, check if customer already placed an order in last 24h
    if (!bypassWarning && !bypassRecentOrder) {
      if (recentOrderWarning) {
        setRecentOrderModalOpen(true);
        return;
      }

      setRecentOrderChecking(true);
      try {
        const params: Record<string, string> = {};
        if (selectedCustomer?.id) {
          params.customerId = selectedCustomer.id;
        } else if (newCustomer.phone.trim()) {
          params.phone = newCustomer.phone.trim();
        } else if (newCustomer.email.trim()) {
          params.email = newCustomer.email.trim();
        }

        if (Object.keys(params).length > 0) {
          const { data } = await api.get("/order/admin-order/check-recent-order", { params });
          if (data && data.hasRecentOrder && data.order) {
            setRecentOrderWarning(data.order);
            setRecentOrderModalOpen(true);
            setRecentOrderChecking(false);
            return;
          }
        }
      } catch (checkErr) {
        console.warn("Recent order pre-check failed, fallback to place check", checkErr);
      } finally {
        setRecentOrderChecking(false);
      }
    }

    setPlacing(true);
    try {
      const body: Record<string, unknown> = {
        items: cart.map(c => ({ productId: c.product.id, variantId: c.variantId ?? undefined, quantity: c.quantity })),
        address,
        paymentMethod,
        ...(paymentNote.trim() ? { paymentNote: paymentNote.trim() } : {}),
        ...(appliedCoupon ? { couponId: appliedCoupon.couponId } : {}),
        ...(bypassWarning || bypassRecentOrder ? { bypassRecentOrderWarning: true } : {}),
      };
      if (selectedCustomer) {
        body.customerId = selectedCustomer.id;
      } else {
        body.newCustomer = {
          username: newCustomer.username.trim(),
          phone: newCustomer.phone.trim(),
          ...(newCustomer.email.trim() ? { email: newCustomer.email.trim() } : {}),
        };
      }
      const { data } = await api.post("/order/admin-order/place", body);
      toast.success("Order placed successfully!");
      setConflictModalOpen(false);
      setConflictCustomer(null);
      setRecentOrderModalOpen(false);
      setRecentOrderWarning(null);
      setBypassRecentOrder(false);
      setPlacedOrder({ id: data.order?.id ?? data.orderId ?? "—" });
    } catch (err: any) {
      if (
        err?.response?.data?.code === "RECENT_ORDER_EXISTS_24H" &&
        err?.response?.data?.recentOrder
      ) {
        setRecentOrderWarning(err.response.data.recentOrder);
        setRecentOrderModalOpen(true);
        return;
      }
      if (
        (err?.response?.data?.code === "CUSTOMER_ALREADY_EXISTS" || err?.response?.status === 409) &&
        err?.response?.data?.existingCustomer
      ) {
        setConflictCustomer(err.response.data.existingCustomer);
        setConflictReason(err.response.data.message || "A customer with this phone number or email already exists.");
        setConflictTriggerSource("place_order");
        setConflictModalOpen(true);
        return;
      }
      toast.error(err?.response?.data?.message ?? "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  // ─── Action when admin confirms using the existing customer inside the conflict modal ───
  const handleSelectConflictCustomerAction = async () => {
    if (!conflictCustomer) return;

    setSelectedCustomer(conflictCustomer);
    setNewCustomer({ username: "", phone: "", email: "" });
    setInlineMatchedCustomer(null);

    if (conflictCustomer.recentAddress && conflictCustomer.recentAddress.fullAddress) {
      const recentLocality = conflictCustomer.recentAddress.locality || "";
      const recentPin = conflictCustomer.recentAddress.zipCode || "";
      setAddress({
        fullAddress: conflictCustomer.recentAddress.fullAddress || "",
        locality: recentLocality,
        city: conflictCustomer.recentAddress.city || "",
        state: conflictCustomer.recentAddress.state || "",
        zipCode: recentPin,
        country: conflictCustomer.recentAddress.country || "India",
        secondaryPhone: conflictCustomer.recentAddress.secondaryPhone || "",
      });
      if (recentLocality) {
        setAvailableLocalities([recentLocality]);
      } else if (recentPin && recentPin.length === 6) {
        fetchPincodeDetails(recentPin).then((res) => {
          if (res.success && res.localities.length > 0) {
            setAvailableLocalities(res.localities);
            const fullLower = (conflictCustomer.recentAddress?.fullAddress || "").toLowerCase();
            const matchedLoc = res.localities.find((loc) => fullLower.includes(loc.toLowerCase()));
            if (matchedLoc) {
              setAddress((p) => ({ ...p, locality: matchedLoc }));
            } else if (res.localities.length === 1) {
              setAddress((p) => ({ ...p, locality: res.localities[0] }));
            }
          }
        }).catch(() => {});
      }
    }

    if (conflictTriggerSource === "step1_next" || currentStep === "customer") {
      setConflictModalOpen(false);
      setConflictCustomer(null);
      setCurrentStep("products");
      toast.success(`Selected customer: ${conflictCustomer.username}`);
      return;
    }

    // Direct place order from Confirm step
    setConflictSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        customerId: conflictCustomer.id,
        items: cart.map(c => ({ productId: c.product.id, variantId: c.variantId ?? undefined, quantity: c.quantity })),
        address,
        paymentMethod,
        ...(paymentNote.trim() ? { paymentNote: paymentNote.trim() } : {}),
        ...(appliedCoupon ? { couponId: appliedCoupon.couponId } : {}),
        ...(bypassRecentOrder ? { bypassRecentOrderWarning: true } : {}),
      };
      const { data } = await api.post("/order/admin-order/place", body);
      toast.success(`Order placed successfully for ${conflictCustomer.username}!`);
      setConflictModalOpen(false);
      setConflictCustomer(null);
      setRecentOrderModalOpen(false);
      setRecentOrderWarning(null);
      setBypassRecentOrder(false);
      setPlacedOrder({ id: data.order?.id ?? data.orderId ?? "—" });
    } catch (err: any) {
      if (
        err?.response?.data?.code === "RECENT_ORDER_EXISTS_24H" &&
        err?.response?.data?.recentOrder
      ) {
        setConflictModalOpen(false);
        setRecentOrderWarning(err.response.data.recentOrder);
        setRecentOrderModalOpen(true);
        return;
      }
      toast.error(err?.response?.data?.message ?? "Failed to place order");
    } finally {
      setConflictSubmitting(false);
    }
  };

  // ─── Ship order (optional, right after placement) ────────────────────────
  const handleShipOrder = async (payload: ShipOrderPayload) => {
    if (!placedOrder) return;
    setShipSubmitting(true);
    try {
      const { data } = await api.put(`/order/update/${placedOrder.id}`, {
        orderStatus: "SHIPPED",
        ...payload,
      });
      setShippedInfo({
        deliveryPartnerName: data.order?.deliveryPartnerName,
        trackingId: data.order?.trackingId,
      });
      toast.success("Order shipped and customer notified!");
      setShipModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to ship order");
    } finally {
      setShipSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const stepIndex = STEP_ORDER.indexOf(currentStep);

  // ─── Reset state to start a new order ───
  const handleResetForNewOrder = () => {
    setPlacedOrder(null);
    setShippedInfo(null);
    setShipModalOpen(false);
    setConflictCustomer(null);
    setConflictModalOpen(false);
    setConflictSubmitting(false);
    setConflictReason("");
    setInlineMatchedCustomer(null);
    setRecentOrderWarning(null);
    setRecentOrderModalOpen(false);
    setRecentOrderChecking(false);
    setBypassRecentOrder(false);
    setCurrentStep("customer");
    setSelectedCustomer(null);
    setNewCustomer({ username: "", phone: "", email: "" });
    setCart([]);
    setSelectedVariantByProduct({});
    setCouponCode("");
    setAppliedCoupon(null);
    setAvailableLocalities([]);
    setLocalityDropdownOpen(false);
    setLocalityFilter("");
    setAddress({ fullAddress: "", locality: "", city: "", state: "", zipCode: "", country: "India", secondaryPhone: "" });
    setPaymentMethod("POD");
    setPaymentNote("");
  };

  // ─ Success screen ─
  if (placedOrder) {
    const customerDisplayName = selectedCustomer?.username || newCustomer.username.trim() || "Customer";
    const customerPhones = Array.from(
      new Set([selectedCustomer?.phone || newCustomer.phone, address.secondaryPhone].filter(Boolean))
    ).join(", ");
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const isStorePickup = !(address.fullAddress.trim() || address.city.trim() || address.state.trim() || address.zipCode.trim());

    return (
      <div className="h-[calc(100dvh-4rem)] flex flex-col bg-gray-50 overflow-hidden">
        {/* Consistent Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 tracking-tight shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Place Order on Behalf of Customer</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Walk-in / cash counter order entry</p>
          </div>
          <button
            type="button"
            onClick={handleResetForNewOrder}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0B6B6B] hover:bg-[#084F4F] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Order</span>
          </button>
        </div>

        {/* Central Card Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-sm border border-slate-200/90 p-6 sm:p-8 space-y-6 text-center animate-fadeIn my-auto">
            {/* Top Status & Checkmark */}
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircleSolid className="w-10 h-10" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-1.5">
                  Order Confirmed
                </span>
                <h2 className="text-2xl font-bold text-gray-900">Order Placed Successfully!</h2>
                <p className="text-xs text-gray-500 mt-0.5">Order has been created and saved to records</p>
              </div>

              {/* Order ID Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="text-slate-400 font-medium">Order ID:</span>
                <span className="font-mono font-bold text-[#0B6B6B]">{placedOrder.id}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(placedOrder.id);
                    toast.success("Order ID copied to clipboard!");
                  }}
                  className="text-slate-400 hover:text-slate-700 transition p-1 rounded hover:bg-slate-200/50 cursor-pointer"
                  title="Copy Order ID"
                >
                  <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Order Details Snapshot */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 text-left">
              <div className="flex items-start justify-between border-b border-slate-200/60 pb-3 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
                  <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{customerDisplayName}</p>
                  {customerPhones && (
                    <p className="text-xs font-mono text-slate-600 mt-0.5 truncate">{customerPhones}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Amount</p>
                  <p className="text-lg font-black text-[#0B6B6B] font-mono mt-0.5">₹{orderTotal.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {paymentMethod === "CASH" ? "Prepaid (Cash)" : "Cash on Delivery"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery</p>
                  <p className="font-semibold text-slate-800 mt-0.5 truncate">
                    {isStorePickup
                      ? "Store / Counter Pickup"
                      : `${address.locality ? `${address.locality}, ` : ""}${address.city || "Delivery"}${address.state ? `, ${address.state}` : ""}`}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Items</p>
                  <p className="font-semibold text-slate-800 mt-0.5 truncate">
                    {totalQty} {totalQty === 1 ? "item" : "items"} {cart.length > 0 ? `(${cart.length} ${cart.length === 1 ? "product" : "products"})` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Shipped Info Alert (if shipped) */}
            {shippedInfo && (
              <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-left">
                <TruckIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-emerald-900">Shipment Dispatched</p>
                  <p className="text-[11px] text-emerald-700 truncate">
                    {shippedInfo.deliveryPartnerName ?? "Handled without a courier"}
                    {shippedInfo.trackingId ? ` · Tracking: ${shippedInfo.trackingId}` : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate(`/invoice/${placedOrder.id}`)}
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <DocumentTextIcon className="w-4 h-4 text-slate-600" />
                  <span>Print Slip / Label</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShipModalOpen(true)}
                  disabled={!!shippedInfo}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-98 ${
                    shippedInfo
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      : "bg-[#0B6B6B] hover:bg-[#084F4F] text-white"
                  }`}
                >
                  <TruckIcon className="w-4 h-4" />
                  <span>{shippedInfo ? "Dispatched" : "Ship Order"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetForNewOrder}
                className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-98"
              >
                <PlusIcon className="w-4 h-4" />
                <span>+ Start New Order</span>
              </button>
            </div>
          </div>
        </div>

        <ShipOrderModal
          order={shipModalOpen ? placedOrder : null}
          submitting={shipSubmitting}
          onClose={() => setShipModalOpen(false)}
          onConfirm={handleShipOrder}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 tracking-tight shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Place Order on Behalf of Customer</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Walk-in / cash counter order entry</p>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3.5 shrink-0">
        <ol className="flex items-center gap-0 overflow-x-auto">
          {STEPS.map((step, i) => {
            const done = STEP_ORDER.indexOf(step.id) < stepIndex;
            const active = step.id === currentStep;
            return (
              <li key={step.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (done) setCurrentStep(step.id);
                  }}
                  disabled={!done && !active}
                  className={`flex flex-col sm:flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${active ? "text-[#0B6B6B] bg-[#DDEDEA]" : done ? "text-emerald-700 cursor-pointer hover:bg-emerald-50" : "text-gray-400 cursor-default"}`}
                >
                  {done ? (
                    <CheckCircleSolid className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <step.icon className={`w-5 h-5 shrink-0 ${active ? "text-[#0B6B6B]" : "text-gray-400"}`} />
                  )}
                  {step.label}
                </button>
                {i < STEPS.length - 1 && <ChevronRightIcon className="w-4 h-4 text-gray-300 mx-1 shrink-0" />}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto w-full px-4 sm:px-8 py-6 space-y-6">

        {/* ── STEP 1: Customer ── */}
        {currentStep === "customer" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Customer Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">Enter customer name, phone number, and optional email for this order</p>
            </div>

            {selectedCustomer ? (
              /* Selected Customer Card */
              <div className="max-w-lg flex items-center justify-between gap-3 px-4 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl animate-fadeIn">
                <div className="flex items-center gap-3 min-w-0">
                  <CustomerAvatar name={selectedCustomer.username} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-emerald-900 truncate">{selectedCustomer.username}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        Existing Customer
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {Array.from(new Set([selectedCustomer.phone, selectedCustomer.recentAddress?.secondaryPhone].filter(Boolean))).join(", ") || "No phone"}{" "}
                      {selectedCustomer.email ? `· ${selectedCustomer.email}` : ""}
                    </p>
                    {selectedCustomer.recentAddress?.fullAddress && (
                      <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                        <MapPinIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Address auto-filled ({selectedCustomer.recentAddress.city}, {selectedCustomer.recentAddress.state})</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setNewCustomer({ username: "", phone: "", email: "" });
                    setInlineMatchedCustomer(null);
                    setAddress({ fullAddress: "", city: "", state: "", zipCode: "", country: "India", secondaryPhone: "" });
                  }}
                  className="shrink-0 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-white transition px-2.5 py-1.5 rounded-lg border border-gray-200/80 bg-white/60 cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              /* Customer Form */
              <div className="max-w-lg space-y-4 animate-fadeIn">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <UserCircleIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Full Name <span className="text-rose-500 font-bold normal-case">*</span>
                    </label>
                    {newCustomer.username.trim() && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                    <UserCircleIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Customer name"
                      value={newCustomer.username}
                      onChange={e => setNewCustomer(p => ({ ...p, username: e.target.value }))}
                      className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                    />
                    {newCustomer.username && (
                      <button
                        type="button"
                        onClick={() => setNewCustomer(p => ({ ...p, username: "" }))}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                        title="Clear name"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <PhoneIcon className="w-3.5 h-3.5 text-indigo-600" />
                        Phone <span className="text-rose-500 font-bold normal-case">*</span>
                      </label>
                      {newCustomer.phone.trim() ? (
                        isNewCustomerPhoneValid ? (
                          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                            <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : newCustomer.phone.length === 10 ? (
                          <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 animate-fadeIn">
                            Must start with 6–9
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1 animate-fadeIn">
                            {newCustomer.phone.length}/10 digits
                          </span>
                        )
                      ) : null}
                    </div>
                    <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                      <PhoneIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={newCustomer.phone}
                        onChange={e => handlePhoneChange(e.target.value)}
                        className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                      />
                      {newCustomer.phone && (
                        <button
                          type="button"
                          onClick={() => setNewCustomer(p => ({ ...p, phone: "" }))}
                          className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                          title="Clear phone"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <EnvelopeIcon className="w-3.5 h-3.5 text-indigo-600" />
                        Email <span className="normal-case text-gray-400 font-medium">(optional)</span>
                      </label>
                      {newCustomer.email.trim() ? (
                        isNewCustomerEmailValid ? (
                          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                            <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-600 flex items-center gap-1 animate-fadeIn">
                            Invalid email
                          </span>
                        )
                      ) : null}
                    </div>
                    <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                      <EnvelopeIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                      <input
                        type="email"
                        placeholder="customer@email.com"
                        value={newCustomer.email}
                        onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value.toLowerCase() }))}
                        className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                      />
                      {newCustomer.email && (
                        <button
                          type="button"
                          onClick={() => setNewCustomer(p => ({ ...p, email: "" }))}
                          className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                          title="Clear email"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline banner when matching customer is detected */}
                {inlineMatchedCustomer && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
                    <div className="flex items-center gap-3 min-w-0">
                      <CustomerAvatar name={inlineMatchedCustomer.username} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                            Customer Already Exists
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 truncate mt-0.5">
                          {inlineMatchedCustomer.username}
                        </p>
                        <p className="text-[11px] text-gray-600 truncate">
                          {inlineMatchedCustomer.phone ?? "No phone"} {inlineMatchedCustomer.email ? `· ${inlineMatchedCustomer.email}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        selectCustomer(inlineMatchedCustomer);
                        setInlineMatchedCustomer(null);
                        toast.success(`Selected customer: ${inlineMatchedCustomer.username}`);
                      }}
                      className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                      Use This Customer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Products ── */}
        {currentStep === "products" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product picker */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-800">Add Products</h2>
              <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                <MagnifyingGlassIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                <input
                  type="text"
                  placeholder="Search products by title, SKU, or category…"
                  value={productSearch}
                  onChange={e => handleProductSearch(e.target.value)}
                  className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                />
                {productsLoading ? (
                  <div className="absolute right-3 pointer-events-none">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : productSearch ? (
                  <button
                    type="button"
                    onClick={() => handleProductSearch("")}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>

              {productsLoading && products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 font-medium">Loading products…</p>
                </div>
              ) : (
                <div className="relative">
                  {productsLoading && products.length > 0 && (
                    <div className="absolute -top-2 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden rounded-full z-10">
                      <div className="h-full bg-indigo-600 animate-pulse w-full" />
                    </div>
                  )}

                  <ul className={`space-y-3 transition-opacity duration-150 ${productsLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
                  {products.map(p => {
                    const hasVariants = (p.variants?.length ?? 0) > 0;
                    const inCart = findCartLine(p.id, null);
                    const displayImg = p.image;
                    const isRowClickable = !hasVariants && !inCart && p.stock > 0;

                    if (hasVariants) {
                      const totalProductInCart = cart
                        .filter(c => c.product.id === p.id)
                        .reduce((sum, c) => sum + c.quantity, 0);

                      const variantPrices = p.variants!.map(v => v.priceOverride ?? p.price);
                      const minPrice = Math.min(...variantPrices);
                      const maxPrice = Math.max(...variantPrices);
                      const priceRange = minPrice === maxPrice
                        ? `₹${minPrice.toLocaleString("en-IN")}`
                        : `₹${minPrice.toLocaleString("en-IN")} – ₹${maxPrice.toLocaleString("en-IN")}`;

                      return (
                        <li
                          key={p.id}
                          className="flex flex-col gap-4 p-4 sm:p-5 rounded-3xl transition-colors duration-150 border border-slate-200/90 bg-white shadow-xs hover:border-slate-300"
                        >
                          {/* Product header row */}
                          <div className="flex items-start gap-3.5 w-full">
                            {displayImg ? (
                              <img
                                src={displayImg}
                                alt={p.name}
                                className="w-14 h-14 rounded-2xl object-contain shrink-0 border border-slate-100 bg-slate-50 p-1 shadow-2xs"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                                <ShoppingCartIcon className="w-6 h-6 text-gray-400" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm sm:text-base font-bold text-gray-900 truncate">{p.name}</p>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/80 shrink-0">
                                  {p.variants!.length} Options
                                </span>
                                {totalProductInCart > 0 && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0B6B6B] text-white shrink-0">
                                    In Cart ({totalProductInCart})
                                  </span>
                                )}
                              </div>

                              {p.description && stripHtml(p.description) && (
                                <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-1 mt-0.5" title={stripHtml(p.description)}>
                                  {stripHtml(p.description)}
                                </p>
                              )}

                              <p className="text-xs text-slate-500 mt-1">
                                Price: <span className="font-semibold text-slate-800">{priceRange}</span>
                              </p>
                            </div>
                          </div>

                          {/* Variant cards container under that product */}
                          <div className="w-full pt-3 border-t border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Available Options / Packs
                              </span>
                              <span className="text-[11px] text-slate-400 hidden sm:inline">
                                Click an option to add to cart
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                              {p.variants!.map(v => {
                                const variantInCart = findCartLine(p.id, v.id);
                                const isOutOfStock = v.stock <= 0;
                                const price = v.priceOverride ?? p.price;
                                const variantImg = v.image || (v.images && v.images.length > 0 ? v.images[0] : null) || p.image;

                                return (
                                  <div
                                    key={v.id}
                                    onClick={() => {
                                      if (!isOutOfStock && !variantInCart) {
                                        addToCart(p, v.id);
                                      }
                                    }}
                                    className={`relative flex flex-col justify-between p-3 rounded-2xl border transition-all duration-150 select-none ${
                                      variantInCart
                                        ? "bg-white border-[#0B6B6B] shadow-xs ring-1 ring-[#0B6B6B]/20"
                                        : isOutOfStock
                                        ? "bg-slate-50/70 border-slate-200/60 opacity-60 cursor-not-allowed"
                                        : "bg-white hover:border-slate-300 border-slate-200/90 shadow-2xs hover:shadow-xs cursor-pointer"
                                    }`}
                                  >
                                    {/* Top: Image + Full Variant Name & Stock */}
                                    <div className="flex items-start gap-2.5 w-full">
                                      <div className="w-11 h-11 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center p-1 relative overflow-hidden border border-slate-100">
                                        {variantImg ? (
                                          <img
                                            src={variantImg}
                                            alt={formatVariantLabel(v.options)}
                                            loading="eager"
                                            className="w-full h-full object-contain pointer-events-none"
                                          />
                                        ) : (
                                          <div className="flex flex-col items-center justify-center text-slate-300">
                                            <ShoppingCartIcon className="w-5 h-5 stroke-1 text-slate-400" />
                                          </div>
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <h4
                                          className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2"
                                          title={formatVariantLabel(v.options)}
                                        >
                                          {formatVariantLabel(v.options)}
                                        </h4>
                                        <p className="text-[11px] mt-0.5">
                                          {v.stock > 0 ? (
                                            <span className="text-emerald-600 font-semibold">{v.stock} in stock</span>
                                          ) : (
                                            <span className="text-rose-600 font-semibold">Out of stock</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Bottom: Dedicated row for Price & Stepper / Add Button */}
                                    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                      <span className="text-xs sm:text-sm font-black text-gray-900 shrink-0">
                                        ₹{price.toLocaleString("en-IN")}
                                      </span>

                                      {variantInCart ? (
                                        <div className="shrink-0 inline-flex items-center gap-1.5 bg-[#0B6B6B] text-white px-2 h-7 rounded-full shadow-xs">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateQty(p.id, v.id, variantInCart.quantity - 1, v.stock);
                                            }}
                                            className="w-4 h-4 flex items-center justify-center hover:bg-[#084F4F] rounded-full transition cursor-pointer text-white"
                                            title="Decrease quantity"
                                          >
                                            <MinusIcon className="w-2.5 h-2.5 stroke-[2.5]" />
                                          </button>
                                          <span className="text-xs font-bold min-w-3 text-center text-white">
                                            {variantInCart.quantity}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateQty(p.id, v.id, variantInCart.quantity + 1, v.stock);
                                            }}
                                            disabled={variantInCart.quantity >= v.stock}
                                            className="w-4 h-4 flex items-center justify-center hover:bg-[#084F4F] rounded-full transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-white"
                                            title="Increase quantity"
                                          >
                                            <PlusIcon className="w-2.5 h-2.5 stroke-[2.5]" />
                                          </button>
                                        </div>
                                      ) : v.stock > 0 ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart(p, v.id);
                                          }}
                                          className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 bg-[#0B6B6B] hover:bg-[#084F4F] text-white px-2.5 h-7 rounded-full text-[11px] font-bold shadow-xs transition cursor-pointer active:scale-95"
                                        >
                                          <PlusIcon className="w-3 h-3 stroke-[2.5]" />
                                          <span>Add</span>
                                        </button>
                                      ) : (
                                        <span className="shrink-0 whitespace-nowrap text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                          Out of stock
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li
                        key={p.id}
                        onClick={() => {
                          if (isRowClickable) {
                            addToCart(p, null);
                          }
                        }}
                        className={`relative flex items-center gap-3.5 p-3.5 sm:p-4 rounded-3xl border transition-colors duration-150 select-none ${
                          inCart
                            ? "bg-white border-neutral-900 shadow-sm"
                            : isRowClickable
                              ? "cursor-pointer hover:border-slate-300 border-slate-200/90 bg-white shadow-2xs hover:shadow-xs"
                              : "border-slate-200/60 bg-slate-50/50 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        {/* Left: Image slightly big */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 bg-slate-50/80 rounded-2xl flex items-center justify-center p-1.5 relative overflow-hidden border border-slate-100/80">
                          {displayImg ? (
                            <img src={displayImg} alt={p.name} loading="eager" className="w-full h-full object-contain pointer-events-none" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-300">
                              <ShoppingCartIcon className="w-7 h-7 stroke-1 text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Right: Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 h-full">
                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-gray-900 truncate">{p.name}</h4>
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5" title={stripHtml(p.description)}>
                              {p.stock > 0 ? (
                                <span className="text-emerald-600 font-semibold">{p.stock} in stock</span>
                              ) : (
                                <span className="text-rose-600 font-semibold">Out of stock</span>
                              )}
                              {p.description && stripHtml(p.description) ? ` · ${stripHtml(p.description)}` : ""}
                            </p>
                          </div>

                          {/* Bottom row: Price and Black pill stepper */}
                          <div className="flex items-center justify-between gap-2 mt-2 h-7 sm:h-8" onClick={e => e.stopPropagation()}>
                            <span className="text-sm sm:text-base font-bold text-gray-900">
                              ₹{p.price.toLocaleString("en-IN")}
                            </span>

                            {inCart ? (
                              <div className="shrink-0 inline-flex items-center gap-2 bg-[#0B6B6B] text-white px-2.5 h-7 sm:h-8 rounded-full shadow-xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQty(p.id, null, inCart.quantity - 1, p.stock);
                                  }}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-[#084F4F] rounded-full transition cursor-pointer text-white"
                                  title="Decrease quantity"
                                >
                                  <MinusIcon className="w-3 h-3 stroke-[2.5]" />
                                </button>
                                <span className="text-xs font-bold min-w-4 text-center text-white">{inCart.quantity}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQty(p.id, null, inCart.quantity + 1, p.stock);
                                  }}
                                  disabled={inCart.quantity >= p.stock}
                                  className="w-5 h-5 flex items-center justify-center hover:bg-[#084F4F] rounded-full transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-white"
                                  title="Increase quantity"
                                >
                                  <PlusIcon className="w-3 h-3 stroke-[2.5]" />
                                </button>
                              </div>
                            ) : p.stock > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(p, null);
                                }}
                                className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 bg-[#0B6B6B] hover:bg-[#084F4F] text-white px-3.5 h-7 sm:h-8 rounded-full text-xs font-bold shadow-xs transition cursor-pointer active:scale-95"
                              >
                                <PlusIcon className="w-3 h-3 stroke-[2.5]" />
                                <span>Add</span>
                              </button>
                            ) : (
                              <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                Out of stock
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {products.length === 0 && !productsLoading && (
                    <li className="py-10 text-center text-gray-400 text-sm">No products found</li>
                  )}
                </ul>
                </div>
              )}

              {/* Pagination */}
              {productTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={productPage <= 1 || productsLoading}
                    onClick={() => handleProductPageChange(productPage - 1)}
                    className="flex items-center gap-1 text-xs text-gray-600 disabled:opacity-40 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeftIcon className="w-4 h-4" /> Prev
                  </button>
                  <span className="text-xs text-gray-500">Page {productPage} / {productTotalPages}</span>
                  <button
                    type="button"
                    disabled={productPage >= productTotalPages || productsLoading}
                    onClick={() => handleProductPageChange(productPage + 1)}
                    className="flex items-center gap-1 text-xs text-gray-600 disabled:opacity-40 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    Next <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Cart summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 h-fit sticky top-6 self-start">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-800">Cart ({cart.length})</h2>
                {cart.length > 0 && (
                  <span className="text-xs font-bold text-emerald-600">
                    ₹{orderTotal.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              {cart.length === 0 ? (
                <div className="py-8 text-center space-y-1.5">
                  <ShoppingCartIcon className="w-8 h-8 text-gray-300 mx-auto stroke-1" />
                  <p className="text-sm font-medium text-gray-500">No items yet</p>
                  <p className="text-xs text-gray-400">Click "+ Add" on a product or option</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 space-y-0 max-h-72 overflow-y-auto pr-1">
                  {cart.map(item => (
                    <li key={`${item.product.id}-${item.variantId ?? "base"}`} className="flex items-center gap-2 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{item.product.name}</p>
                        {item.variantOptions && (
                          <p className="text-[11px] text-gray-400 truncate">
                            {Object.entries(item.variantOptions).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">₹{item.unitPrice.toLocaleString("en-IN")} × {item.quantity}</p>
                      </div>
                      <p className="text-xs font-bold text-[#0B6B6B] shrink-0">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</p>
                      <button type="button" onClick={() => removeFromCart(item.product.id, item.variantId)}
                        className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {cart.length > 0 && (
                <>
                  {/* Coupon */}
                  <div className="pt-3 border-t border-gray-100">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl animate-fadeIn">
                        <div className="flex items-center gap-2 min-w-0">
                          <TicketIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-900 truncate">{appliedCoupon.code}</p>
                            <p className="text-[11px] text-emerald-600">
                              {appliedCoupon.discountType === "PERCENTAGE"
                                ? `${appliedCoupon.discountValue}% off`
                                : `₹${appliedCoupon.discountAmount.toLocaleString("en-IN")} off`}
                            </p>
                          </div>
                        </div>
                        <button type="button" onClick={handleRemoveCoupon}
                          className="shrink-0 text-emerald-700 hover:text-red-600 transition-colors">
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <TicketIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Coupon code"
                            value={couponCode}
                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                            className="w-full pl-8 pr-2 py-2 text-xs font-semibold uppercase tracking-wide border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B6B6B]/20 focus:border-[#0B6B6B] transition"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim() || couponLoading}
                          className="shrink-0 px-3 py-2 text-xs font-bold text-[#0B6B6B] border border-[#0B6B6B]/30 rounded-lg hover:bg-[#DDEDEA] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          {couponLoading ? "…" : "Apply"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200 space-y-1.5">
                    {appliedCoupon && (
                      <>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Subtotal</span>
                          <span>₹{cartTotal.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                          <span>Discount</span>
                          <span>−₹{appliedCoupon.discountAmount.toLocaleString("en-IN")}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-sm font-bold text-gray-800">
                      <span>Total</span>
                      <span>₹{orderTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Address ── */}
        {currentStep === "address" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs shrink-0">
                  <MapPinIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">Delivery Address</h2>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      Optional
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Enter shipping address for delivery, or leave blank for store / counter pickup</p>
                </div>
              </div>
              {selectedCustomer?.recentAddress?.fullAddress && (
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 animate-fadeIn">
                    <CheckCircleSolid className="w-3.5 h-3.5 text-emerald-600" />
                    Auto-filled from previous order
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Row 1: Zip / PIN Code & Post Office / Locality */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Zip / PIN Code */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <HashtagIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Zip / PIN Code <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    {pincodeLoading ? (
                      <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1.5 animate-fadeIn">
                        <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        Detecting…
                      </span>
                    ) : address.zipCode.trim().length === 6 ? (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : null}
                  </div>
                  <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                    <HashtagIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                    <input
                      type="text"
                      placeholder="600001"
                      maxLength={6}
                      value={address.zipCode}
                      onChange={e => handlePincodeChange(e.target.value)}
                      className="w-full pl-3 pr-9 h-11 text-sm font-semibold tracking-wider text-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal bg-transparent focus:outline-none"
                    />
                    {pincodeLoading ? (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : address.zipCode ? (
                      <button
                        type="button"
                        onClick={handleClearPincode}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                        title="Clear PIN code"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Enter 6-digit PIN code to auto-detect City, State & Post Offices.
                  </p>
                </div>

                {/* Post Office / Locality */}
                <div className="space-y-1.5" ref={localityDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <MapPinIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Post Office / Locality <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    {address.locality?.trim() ? (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" /> Selected
                      </span>
                    ) : availableLocalities.length > 1 ? (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full animate-fadeIn">
                        {availableLocalities.length} under PIN
                      </span>
                    ) : null}
                  </div>

                  {availableLocalities.length > 0 ? (
                    <div className="relative">
                      {/* Trigger Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setLocalityDropdownOpen(prev => !prev);
                          setLocalityFilter("");
                        }}
                        className={`w-full flex items-center justify-between px-3.5 h-11 rounded-xl border text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                          localityDropdownOpen
                            ? "border-indigo-500 bg-white ring-4 ring-indigo-500/15 shadow-md"
                            : "bg-gray-50/60 hover:bg-gray-50/20 hover:border-gray-300 border-gray-200 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MapPinIcon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              localityDropdownOpen || address.locality ? "text-indigo-600" : "text-gray-400"
                            }`}
                          />
                          <span className={`truncate ${address.locality ? "text-gray-900 font-semibold" : "text-gray-400 font-normal"}`}>
                            {address.locality || "-- Select Post Office / Area --"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {address.locality && (
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddress(p => ({ ...p, locality: "" }));
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              title="Clear post office"
                            >
                              <XMarkIcon className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <ChevronDownIcon
                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                              localityDropdownOpen ? "rotate-180 text-indigo-600" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {/* Dropdown Menu */}
                      {localityDropdownOpen && (
                        <div className="absolute left-0 right-0 z-30 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-indigo-950/10 p-2 animate-fadeIn">
                          {/* Search filter inside dropdown */}
                          <div className="relative mb-2">
                            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                              type="text"
                              autoFocus
                              placeholder="Type to filter post office…"
                              value={localityFilter}
                              onChange={e => setLocalityFilter(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                          </div>

                          {/* Options List */}
                          <div className="max-h-56 overflow-y-auto space-y-0.5">
                            {availableLocalities
                              .filter(loc => loc.toLowerCase().includes(localityFilter.trim().toLowerCase()))
                              .map(loc => {
                                const isSelected = address.locality === loc;
                                return (
                                  <button
                                    key={loc}
                                    type="button"
                                    onClick={() => {
                                      setAddress(p => ({ ...p, locality: loc }));
                                      setLocalityDropdownOpen(false);
                                      setLocalityFilter("");
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors text-left cursor-pointer ${
                                      isSelected
                                        ? "bg-indigo-50 text-indigo-700 font-bold"
                                        : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-indigo-600" : "bg-slate-300"}`} />
                                      <span className="truncate">{loc}</span>
                                    </div>
                                    {isSelected && <CheckIcon className="w-4 h-4 text-indigo-600 shrink-0" />}
                                  </button>
                                );
                              })}
                            {localityFilter.trim() && !availableLocalities.some(loc => loc.toLowerCase() === localityFilter.trim().toLowerCase()) && (
                              <div className="pt-1.5 border-t border-gray-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddress(p => ({ ...p, locality: localityFilter.trim() }));
                                    setLocalityDropdownOpen(false);
                                    setLocalityFilter("");
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer"
                                >
                                  <span>Use custom:</span>
                                  <strong className="truncate font-bold">"{localityFilter.trim()}"</strong>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                      <MapPinIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                      <input
                        type="text"
                        placeholder="e.g. Ayathil B.O, Pattathanam S.O"
                        value={address.locality || ""}
                        onChange={e => setAddress(p => ({ ...p, locality: e.target.value }))}
                        className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                      />
                      {address.locality && (
                        <button
                          type="button"
                          onClick={() => setAddress(p => ({ ...p, locality: "" }))}
                          className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                          title="Clear post office"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400">
                    {availableLocalities.length > 0
                      ? `${availableLocalities.length} post office(s) under PIN ${address.zipCode}. Select branch for delivery.`
                      : "Enter 6-digit PIN to load official post offices, or type manually."}
                  </p>
                </div>
              </div>

              {/* Row 2: City / District, State & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                {/* City */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <BuildingOffice2Icon className="w-3.5 h-3.5 text-indigo-600" />
                      City / District <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    {address.city.trim() && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                    <BuildingOffice2Icon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                    <input
                      type="text"
                      placeholder="e.g. Kollam, Mumbai"
                      value={address.city}
                      onChange={e => setAddress(p => ({ ...p, city: e.target.value }))}
                      className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                    />
                    {address.city && (
                      <button
                        type="button"
                        onClick={() => setAddress(p => ({ ...p, city: "" }))}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                        title="Clear city"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* State */}
                <div className="space-y-1.5" ref={stateDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <MapIcon className="w-3.5 h-3.5 text-indigo-600" />
                      State <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    {address.state.trim() && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" /> Valid
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setStateDropdownOpen(prev => !prev);
                        setStateFilter("");
                      }}
                      className={`w-full flex items-center justify-between px-3.5 h-11 rounded-xl border text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                        stateDropdownOpen
                          ? "border-indigo-500 bg-white ring-4 ring-indigo-500/15 shadow-md"
                          : "bg-gray-50/60 hover:bg-gray-50/20 hover:border-gray-300 border-gray-200 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapIcon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            stateDropdownOpen || address.state ? "text-indigo-600" : "text-gray-400"
                          }`}
                        />
                        <span className={`truncate ${address.state ? "text-gray-900 font-semibold" : "text-gray-400 font-normal"}`}>
                          {address.state || "Select State"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {address.state && (
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddress(p => ({ ...p, state: "" }));
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Clear state"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <ChevronDownIcon
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                            stateDropdownOpen ? "rotate-180 text-indigo-600" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* Matching Custom Dropdown Menu */}
                    {stateDropdownOpen && (
                      <div className="absolute left-0 right-0 z-30 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-indigo-950/10 p-2 animate-fadeIn">
                        {/* Search filter inside dropdown */}
                        <div className="relative mb-2">
                          <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Type to search state…"
                            value={stateFilter}
                            onChange={e => setStateFilter(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          />
                        </div>

                        {/* Options List */}
                        <div className="max-h-56 overflow-y-auto space-y-0.5">
                          {INDIAN_STATES.filter(st =>
                            st.toLowerCase().includes(stateFilter.trim().toLowerCase())
                          ).map(st => {
                            const isSelected = address.state === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => {
                                  setAddress(p => ({ ...p, state: st }));
                                  setStateDropdownOpen(false);
                                  setStateFilter("");
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors text-left cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-50 text-indigo-700 font-bold"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                                }`}
                              >
                                <span>{st}</span>
                                {isSelected && <CheckIcon className="w-4 h-4 text-indigo-600 shrink-0" />}
                              </button>
                            );
                          })}
                          {INDIAN_STATES.filter(st =>
                            st.toLowerCase().includes(stateFilter.trim().toLowerCase())
                          ).length === 0 && (
                            <div className="py-4 text-center">
                              <p className="text-xs text-gray-400 mb-2">No matching state</p>
                              {stateFilter.trim() && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddress(p => ({ ...p, state: stateFilter.trim() }));
                                    setStateDropdownOpen(false);
                                    setStateFilter("");
                                  }}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                                >
                                  Use "{stateFilter.trim()}"
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Country */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <GlobeAmericasIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Country <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200/60">
                      Domestic
                    </span>
                  </div>
                  <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                    <span className="ml-3.5 text-base leading-none select-none pointer-events-none">🇮🇳</span>
                    <input
                      type="text"
                      placeholder="India"
                      value={address.country}
                      onChange={e => setAddress(p => ({ ...p, country: e.target.value }))}
                      className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                    />
                    {address.country && address.country !== "India" && (
                      <button
                        type="button"
                        onClick={() => setAddress(p => ({ ...p, country: "India" }))}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                        title="Reset to India"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Full Address & Secondary Phone side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
                {/* Full Address (Taller height with auto-expansion so full address wraps and is visible without scrolling) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <HomeIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Full Address <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    {address.fullAddress.trim() && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" /> Filled
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-start bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                    <HomeIcon className="w-4 h-4 ml-3.5 mt-3 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                    <textarea
                      ref={addressTextareaRef}
                      rows={2}
                      placeholder="Door no., building, street, locality, landmark…"
                      value={address.fullAddress}
                      title={address.fullAddress || undefined}
                      onChange={e => setAddress(p => ({ ...p, fullAddress: e.target.value }))}
                      className="w-full pl-3 pr-9 py-2.5 min-h-[72px] resize-none text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none leading-snug overflow-hidden"
                    />
                    {address.fullAddress && (
                      <button
                        type="button"
                        onClick={() => setAddress(p => ({ ...p, fullAddress: "" }))}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                        title="Clear address"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">Door no., street, and landmark for delivery.</p>
                </div>

                {/* Secondary Phone (Standard compact height on right side) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <PhoneIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Secondary Phone <span className="text-gray-400 font-normal lowercase tracking-normal">(optional)</span>
                    </label>
                    {address.secondaryPhone?.trim() && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 animate-fadeIn">
                        <CheckCircleSolid className="w-3.5 h-3.5" />
                        {selectedCustomer?.recentAddress?.secondaryPhone &&
                        selectedCustomer.recentAddress.secondaryPhone === address.secondaryPhone?.trim()
                          ? "Auto-filled"
                          : "Entered"}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group">
                    <PhoneIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210 (Alternate contact for delivery partner)"
                      value={address.secondaryPhone || ""}
                      onChange={e => {
                        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setAddress(p => ({ ...p, secondaryPhone: cleaned }));
                      }}
                      className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none font-mono"
                    />
                    {address.secondaryPhone && (
                      <button
                        type="button"
                        onClick={() => setAddress(p => ({ ...p, secondaryPhone: "" }))}
                        className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
                        title="Clear secondary phone"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">Optional backup contact for delivery partner (auto-filled from previous order if available).</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Payment ── */}
        {currentStep === "payment" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Payment Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod("POD")}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-colors
                  ${paymentMethod === "POD" ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 bg-white"}`}
              >
                <MapPinIcon className={`w-8 h-8 ${paymentMethod === "POD" ? "text-indigo-600" : "text-gray-400"}`} />
                <span className={`font-bold text-sm ${paymentMethod === "POD" ? "text-indigo-700" : "text-gray-600"}`}>Pay on Delivery</span>
                <span className="text-xs text-gray-500 text-center">Payment will be collected at delivery</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-colors
                  ${paymentMethod === "CASH" ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-300 bg-white"}`}
              >
                <CreditCardIcon className={`w-8 h-8 ${paymentMethod === "CASH" ? "text-indigo-600" : "text-gray-400"}`} />
                <span className={`font-bold text-sm ${paymentMethod === "CASH" ? "text-indigo-700" : "text-gray-600"}`}>Prepaid</span>
                <span className="text-xs text-gray-500 text-center">Customer paid in advance / counter cash</span>
              </button>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                <DocumentTextIcon className="w-3.5 h-3.5 text-indigo-600" />
                Payment Note <span className="text-gray-400 font-normal lowercase tracking-normal">(receipt no, UPI ref, etc.)</span>
              </label>
              <div className="relative flex items-center bg-gray-50/60 hover:bg-gray-50/20 focus-within:bg-white border border-gray-200 hover:border-gray-300 focus-within:border-indigo-500 rounded-xl shadow-xs focus-within:shadow-md focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all duration-200 group max-w-xl">
                <DocumentTextIcon className="w-4 h-4 ml-3.5 text-gray-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Receipt #1234, UPI ref: abc123xyz"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full pl-3 pr-9 h-11 text-sm font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal bg-transparent focus:outline-none"
                />
                {paymentNote && (
                  <button
                    type="button"
                    onClick={() => setPaymentNote("")}
                    className="absolute right-3 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
                    title="Clear note"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Confirm ── */}
        {currentStep === "confirm" && (
          <div className="space-y-4">
            {recentOrderWarning && (
              <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4 shadow-sm animate-fadeIn">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                    <ClockIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-amber-950">
                        Notice: Previous Order Placed in Last 24 Hours
                      </h4>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono">
                        {recentOrderWarning.relativeTime}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      This customer placed an order on{" "}
                      <strong className="text-amber-950 underline decoration-amber-400">
                        {recentOrderWarning.formattedTime}
                      </strong>{" "}
                      ({recentOrderWarning.relativeTime}) for ₹{recentOrderWarning.finalAmount.toLocaleString("en-IN")}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRecentOrderModalOpen(true)}
                  className="shrink-0 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  View Details
                </button>
              </div>
            )}

            {/* Customer summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Customer</h3>
              {selectedCustomer ? (
                <div>
                  <p className="font-semibold text-gray-800">{selectedCustomer.username}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.phone ?? "—"} · {selectedCustomer.email ?? "No email"}</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-gray-800">{newCustomer.username} <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">New</span></p>
                  <p className="text-sm text-gray-500">{newCustomer.phone} {newCustomer.email ? `· ${newCustomer.email}` : ""}</p>
                </div>
              )}
            </div>

            {/* Items summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Items ({cart.length})</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2 text-left font-semibold">Product</th>
                    <th className="pb-2 text-center font-semibold">Qty</th>
                    <th className="pb-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cart.map(item => (
                    <tr key={`${item.product.id}-${item.variantId ?? "base"}`}>
                      <td className="py-2 text-gray-700">
                        {item.product.name}
                        {item.variantOptions && (
                          <span className="block text-xs text-gray-400">
                            {Object.entries(item.variantOptions).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-2 text-right font-semibold text-gray-800">₹{(item.unitPrice * item.quantity).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {appliedCoupon && (
                    <>
                      <tr>
                        <td colSpan={2} className="pt-3 text-gray-500">Subtotal</td>
                        <td className="pt-3 text-right text-gray-600">₹{cartTotal.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="text-emerald-600 font-semibold flex items-center gap-1.5 pt-1">
                          <TicketIcon className="w-3.5 h-3.5" /> {appliedCoupon.code}
                        </td>
                        <td className="text-right text-emerald-600 font-semibold pt-1">−₹{appliedCoupon.discountAmount.toLocaleString("en-IN")}</td>
                      </tr>
                    </>
                  )}
                  <tr className="border-t border-gray-200">
                    <td colSpan={2} className="pt-3 font-bold text-gray-800">Total</td>
                    <td className="pt-3 text-right font-bold text-indigo-700 text-base">₹{orderTotal.toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Address summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Delivery Address</h3>
                {!(address.fullAddress.trim() || address.city.trim() || address.state.trim() || address.zipCode.trim()) && (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                    Store / Counter Pickup
                  </span>
                )}
              </div>
              {address.fullAddress.trim() || address.city.trim() || address.state.trim() || address.zipCode.trim() ? (
                <div>
                  {address.fullAddress.trim() && <p className="text-sm font-medium text-gray-800">{address.fullAddress}</p>}
                  <p className="text-sm text-gray-500">
                    {[address.locality ? `PO: ${address.locality}` : "", address.city, address.state].filter(Boolean).join(", ")}
                    {address.zipCode ? ` ${address.zipCode}` : ""}
                    {address.country ? `, ${address.country}` : ""}
                  </p>
                  {address.secondaryPhone && (
                    <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1.5">
                      <PhoneIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Phone:</span>
                      <strong className="text-gray-800 font-mono">
                        {Array.from(new Set([selectedCustomer?.phone || newCustomer.phone, address.secondaryPhone].filter(Boolean))).join(", ")}
                      </strong>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-sm text-gray-500 py-1">
                  <BuildingStorefrontIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>No delivery address specified (Handled as Store / Counter Pickup)</span>
                </div>
              )}
            </div>

            {/* Payment summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Payment</h3>
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${paymentMethod === "CASH" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {paymentMethod === "CASH" ? "Prepaid" : "Pay on Delivery"}
                </span>
                {paymentNote && <span className="text-sm text-gray-500">Ref: {paymentNote}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Navigation Bar (Locked in identical position across ALL steps) ── */}
      <div className="shrink-0 bg-gray-50 border-t border-gray-200/80 px-4 sm:px-8 py-3.5 flex justify-between items-center z-20">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIndex === 0}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
        >
          <ChevronLeftIcon className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-4">
          {cart.length > 0 && currentStep === "products" && (
            <span className="text-xs font-semibold text-gray-600 hidden sm:inline">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} item(s) in cart • <span className="font-bold text-gray-900">₹{orderTotal.toLocaleString("en-IN")}</span>
            </span>
          )}

          {currentStep !== "confirm" ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-bold text-white bg-[#0B6B6B] hover:bg-[#084F4F] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#0B6B6B]/25 active:scale-95 cursor-pointer min-w-[110px]"
            >
              Next <ChevronRightIcon className="w-4 h-4 stroke-[2]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePlaceOrder(false)}
              disabled={placing || recentOrderChecking}
              className="flex items-center justify-center gap-2 px-7 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-green-600/25 cursor-pointer min-w-[140px]"
            >
              {placing || recentOrderChecking ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {recentOrderChecking ? "Checking…" : "Placing…"}</>
              ) : (
                <><CheckCircleIcon className="w-4 h-4" /> Place Order</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Duplicate Customer Conflict Modal ── */}
      {conflictModalOpen && conflictCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl shadow-gray-900/20 max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-5 bg-gradient-to-br from-indigo-50/80 via-white to-white border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/25">
                  <UserCircleIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-950 tracking-tight">Customer Already Exists</h2>
                  <span className="inline-block mt-0.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-full">
                    Existing Customer Found
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConflictModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-1.5 transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                {conflictReason || "A customer with this phone number or email is already registered."}{" "}
                {conflictTriggerSource === "step1_next" || currentStep === "customer"
                  ? "Would you like to select this existing customer and continue to product selection?"
                  : "Would you like to select this customer to complete and place the order immediately?"}
              </p>

              {/* Matched Customer Profile Card */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3 text-indigo-600" />
                    Matched Customer Account
                  </span>
                  <span className="text-xs font-semibold text-gray-400 font-mono">ID: #{conflictCustomer.id.slice(-6)}</span>
                </div>

                <div className="flex items-center gap-3.5 pt-0.5">
                  <CustomerAvatar name={conflictCustomer.username} size="md" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-gray-900 truncate">
                      {conflictCustomer.username}
                    </h4>
                    {newCustomer.username.trim() && newCustomer.username.trim().toLowerCase() !== conflictCustomer.username.toLowerCase() && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Entered name: <span className="font-medium text-gray-600">"{newCustomer.username}"</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                        {conflictCustomer.phone ?? "No phone"}
                      </span>
                      {conflictCustomer.email && (
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400" />
                          {conflictCustomer.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConflictModalOpen(false);
                    setCurrentStep("customer");
                  }}
                  disabled={conflictSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition text-center disabled:opacity-50"
                >
                  Edit Customer Details
                </button>
                <button
                  type="button"
                  onClick={handleSelectConflictCustomerAction}
                  disabled={conflictSubmitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition disabled:opacity-60"
                >
                  {conflictSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Placing Order…
                    </>
                  ) : conflictTriggerSource === "step1_next" || currentStep === "customer" ? (
                    <>
                      Select & Continue <ArrowRightIcon className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      Select & Place Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 24-Hour Recent Order Warning Modal ── */}
      {recentOrderModalOpen && recentOrderWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl shadow-gray-900/30 max-w-lg w-full overflow-hidden border border-amber-200/90 flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-5 bg-gradient-to-br from-amber-50 via-amber-50/40 to-white border-b border-amber-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25">
                  <ClockIcon className="h-6 w-6 stroke-[2]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-950 tracking-tight">Recent Order Detected</h2>
                  <span className="inline-block mt-0.5 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Placed within last 24 hours
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecentOrderModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-1.5 transition cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl">
                <p className="text-sm font-semibold text-amber-950 leading-relaxed">
                  ⚠️ This customer has already placed an order in the last 24 hours.
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Please verify the previous order placement time and order summary below before proceeding to avoid unintentional duplicate orders.
                </p>
              </div>

              {/* Order Highlight Card */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 space-y-3 shadow-2xs">
                {/* Header row */}
                <div className="flex items-center justify-between border-b border-gray-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">Previous Order</span>
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                      #{recentOrderWarning.shortId}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    recentOrderWarning.orderStatus === "DELIVERED"
                      ? "bg-green-100 text-green-800"
                      : recentOrderWarning.orderStatus === "SHIPPED"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {recentOrderWarning.orderStatus}
                  </span>
                </div>

                {/* Key detail: Explicit Order Placement Time */}
                <div className="bg-white rounded-xl border border-amber-200/90 p-3 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <ClockIcon className="w-3.5 h-3.5 text-amber-600" />
                      Order Placement Time
                    </span>
                    <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      {recentOrderWarning.relativeTime}
                    </span>
                  </div>
                  <p className="text-base font-extrabold text-gray-900 tracking-tight">
                    {recentOrderWarning.formattedTime}
                  </p>
                </div>

                {/* Customer & Amount details */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-white rounded-xl border border-gray-200/70 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                      Customer
                    </span>
                    <p className="text-xs font-bold text-gray-800 truncate">
                      {recentOrderWarning.customerName || selectedCustomer?.username || newCustomer.username || "Customer"}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200/70 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                      Order Amount
                    </span>
                    <p className="text-xs font-extrabold text-gray-900">
                      ₹{recentOrderWarning.finalAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Items Summary */}
                {recentOrderWarning.itemsSummary && (
                  <div className="bg-white rounded-xl border border-gray-200/70 p-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                      Items Ordered ({recentOrderWarning.itemsCount})
                    </span>
                    <p className="text-xs text-gray-700 font-medium line-clamp-2">
                      {recentOrderWarning.itemsSummary}
                    </p>
                  </div>
                )}

                {/* Channel & Invoice link */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>
                    Channel:{" "}
                    <strong className="text-gray-700">
                      {recentOrderWarning.placedByAdmin ? "Admin (Counter Sale)" : "Online Store"}
                    </strong>
                  </span>
                  <a
                    href={`/invoice/${recentOrderWarning.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <DocumentTextIcon className="w-3.5 h-3.5" /> View Order Confirmation Slip
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setRecentOrderModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition text-center cursor-pointer"
                >
                  Cancel / Review
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecentOrderModalOpen(false);
                    setBypassRecentOrder(true);
                    handlePlaceOrder(true);
                  }}
                  disabled={placing}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/25 transition disabled:opacity-60 cursor-pointer"
                >
                  {placing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Placing…
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      Place Order Anyway
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
