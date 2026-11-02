import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import {
  MapPinIcon,
  HomeIcon,
  PencilSquareIcon,
  TruckIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { BeatLoader } from "react-spinners";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useCart } from "../context/CartContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { fetchPincodeDetails } from "../utils/pincodeLookup";

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 68.0],
  [37.5, 97.5],
];

/** Invisible component that listens for map clicks — lets the preview-phase map
 * re-point the pin instead of only being a static confirmation image. */
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** MapContainer only honors `center` on initial mount — this keeps the view following
 * `position` if it ever changes from something other than a click on the map itself. */
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SavedAddress {
  id: string;
  fullAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface ShippingPreview {
  shippingCharge: number;
  distanceKm: number;
  type: "other_state" | "same_state_gps" | "manual" | "free";
  label: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  free?: boolean;
}

export interface DeliveryLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Omit for the cart-checkout flow (Cartpage.tsx's "Continue to checkout") — this
   * modal then previews shipping for the whole cart instead of a single product, and
   * skips the "add to cart" step in handleProceed since everything's already there.
   * Set for the "Buy Now" flow (ProductDetailPage.tsx), where the product may not be
   * in the cart yet. */
  product?: { id: string; name: string; price: number; quantity?: number; variantId?: string | null };
}

type Phase = "select" | "manual_form" | "preview";
type LocMode = "gps" | "saved" | "manual";

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeliveryLocationModal({ isOpen, onClose, product }: DeliveryLocationModalProps) {
  const navigate = useNavigate();
  const { cartItems, addToCart, cartTotal } = useCart();
  useBodyScrollLock(isOpen);

  // Cart-checkout mode (no `product`): preview against every cart line instead of one
  // item. Buy Now mode: just the one product, same as before this generalized.
  const orderLines = product
    ? [{ name: product.name, price: product.price, quantity: product.quantity ?? 1 }]
    : cartItems.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity }));
  const orderSubtotal = product ? product.price * (product.quantity ?? 1) : parseFloat(cartTotal) || 0;

  const [phase, setPhase] = useState<Phase>("select");
  const [locMode, setLocMode] = useState<LocMode | null>(null);
  const [savedAddress, setSavedAddress] = useState<SavedAddress | null>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [gpsCoords, setGpsCoords] = useState<[number, number] | null>(null);
  const [preview, setPreview] = useState<ShippingPreview | null>(null);
  const [manualForm, setManualForm] = useState({ fullAddress: "", city: "", state: "", zipCode: "", locality: "" });
  const [availableLocalities, setAvailableLocalities] = useState<string[]>([]);
  const [isLocalityDropdownOpen, setIsLocalityDropdownOpen] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [repositioning, setRepositioning] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const addressInputRef = useRef<HTMLTextAreaElement>(null);

  // Reset + fetch saved address when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPhase("select");
      setLocMode(null);
      setPosition(null);
      setGpsCoords(null);
      setPreview(null);
      setGpsLoading(false);
      setCalcLoading(false);
      setIsProcessing(false);
      setRepositioning(false);
      setManualForm({ fullAddress: "", city: "", state: "", zipCode: "", locality: "" });
      setAvailableLocalities([]);
      setIsLocalityDropdownOpen(false);
      setPincodeLoading(false);
      setPincodeError(null);
      setAddressError(null);
      return;
    }
    api.get("/address/default")
      .then((res) => setSavedAddress(res.data.address))
      .catch(() => setSavedAddress(null));
  }, [isOpen]);

const isWithinIndiaBoundingBox = (lat: number, lng: number): boolean => {
  return lat >= 6.0 && lat <= 38.0 && lng >= 68.0 && lng <= 98.0;
};

  // ── Location handlers ──────────────────────────────────────────────────────

  const handleSelectGPS = () => {
    setLocMode("gps");
    setGpsLoading(true);

    const fallbackToIPGeolocation = async (message: string) => {
      const toastId = toast.loading(message);
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("IP lookup failed");
        const data = await response.json();
        const { latitude, longitude } = data;
        if (latitude === undefined || longitude === undefined) throw new Error("Invalid coordinates");
        
        if (!isWithinIndiaBoundingBox(latitude, longitude)) {
          toast.dismiss(toastId);
          toast.error("Detected location is outside India. Delivery is only available in India.");
          setLocMode(null);
          setGpsLoading(false);
          return;
        }

        setGpsCoords([latitude, longitude]);
        const res = await api.post("/address/preview-shipping", { latitude, longitude });
        setPreview({ ...res.data, lat: latitude, lng: longitude });
        setPosition([latitude, longitude]);
        setPhase("preview");
        toast.dismiss(toastId);
        toast.success("Location estimated via IP successfully!");
      } catch (e: any) {
        toast.dismiss(toastId);
        const msg = e.response?.data?.message || "Could not estimate location. Please enter manually.";
        toast.error(msg);
        setLocMode(null);
      } finally {
        setGpsLoading(false);
      }
    };

    if (!navigator.geolocation) {
      fallbackToIPGeolocation("GPS unavailable (requires HTTPS). Estimating location via IP...");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        if (!isWithinIndiaBoundingBox(latitude, longitude)) {
          toast.error("Detected location is outside India. Delivery is only available in India.");
          setLocMode(null);
          setGpsLoading(false);
          return;
        }
        setGpsCoords([latitude, longitude]);
        try {
          const res = await api.post("/address/preview-shipping", { latitude, longitude });
          setPreview({ ...res.data, lat: latitude, lng: longitude });
          setPosition([latitude, longitude]);
          setPhase("preview");
        } catch (err: any) {
          const msg = err.response?.data?.message || "Failed to calculate shipping for your location";
          toast.error(msg);
          setLocMode(null);
        }
        setGpsLoading(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          fallbackToIPGeolocation("GPS permission denied. Estimating location via IP...");
        } else {
          fallbackToIPGeolocation("GPS signal weak. Estimating location via IP...");
        }
      },
      { enableHighAccuracy: false }
    );
  };

  const handleSelectSaved = async () => {
    if (!savedAddress) return;
    setLocMode("saved");
    setCalcLoading(true);
    try {
      let res;
      if (savedAddress.latitude && savedAddress.longitude) {
        res = await api.post("/address/preview-shipping", {
          latitude: savedAddress.latitude,
          longitude: savedAddress.longitude,
        });
        setPosition([savedAddress.latitude, savedAddress.longitude]);
      } else {
        res = await api.post("/address/preview-shipping", {
          manual: true,
          state: savedAddress.state,
          city: savedAddress.city,
        });
        setPosition(null);
      }
      setPreview(res.data);
      setPhase("preview");
    } catch {
      toast.error("Failed to calculate shipping for your saved address");
      setLocMode(null);
    }
    setCalcLoading(false);
  };

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cleanPincode = val.replace(/\D/g, "").slice(0, 6);
    setManualForm((prev) => ({ ...prev, zipCode: cleanPincode }));
    setPincodeError(null);

    if (cleanPincode.length < 6) {
      setAvailableLocalities([]);
      setManualForm((prev) => ({ ...prev, locality: "" }));
      return;
    }

    if (cleanPincode.length === 6) {
      setPincodeLoading(true);
      try {
        const result = await fetchPincodeDetails(cleanPincode);
        if (result.success) {
          const autoLocality = result.localities.length === 1 ? result.localities[0] : "";
          setManualForm((prev) => ({
            ...prev,
            state: result.state || prev.state,
            city: result.city || prev.city,
            locality: autoLocality,
          }));
          setAvailableLocalities(result.localities);
          setPincodeError(null);

          if (result.localities.length === 1) {
            setIsLocalityDropdownOpen(false);
            toast.success(`Resolved: ${result.localities[0]}, ${result.city}, ${result.state}`);
          } else {
            setIsLocalityDropdownOpen(true);
            toast.success(`Resolved: ${result.city}, ${result.state}. Select your locality.`);
          }
        } else {
          setAvailableLocalities([]);
          setIsLocalityDropdownOpen(false);
          setPincodeError(result.error || "Pincode not found");
          toast.error(result.error || "Pincode not found. Please enter details manually.");
        }
      } catch (err) {
        console.error("Failed to fetch state/city from pincode", err);
        setPincodeError("Unable to verify pincode. Please enter your address details manually.");
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleManualCalculate = async () => {
    const zip = manualForm.zipCode.trim();
    if (!zip || zip.length < 6) {
      toast.error("Please enter a valid 6-digit Pincode", { id: "manual-zip" });
      return;
    }
    if (availableLocalities.length > 1 && !manualForm.locality.trim()) {
      setIsLocalityDropdownOpen(true);
      toast.error("Please select your Post Office / Locality", { id: "manual-locality" });
      return;
    }
    const fullAddr = manualForm.fullAddress.trim();
    if (!fullAddr) {
      setAddressError("Please enter your House / Flat No., Street Name, or Area");
      addressInputRef.current?.focus();
      toast.error("Please enter your Full Address before calculating rates", { id: "manual-address" });
      return;
    }
    if (fullAddr.length < 5) {
      setAddressError("Please enter a complete address (minimum 5 characters)");
      addressInputRef.current?.focus();
      toast.error("Please enter a complete delivery address", { id: "manual-address" });
      return;
    }
    setAddressError(null);
    const state = manualForm.state.trim();
    if (!state) {
      toast.error("Please enter your state", { id: "manual-state" });
      return;
    }
    setCalcLoading(true);
    try {
      const res = await api.post("/address/preview-shipping", {
        manual: true,
        state,
        city: manualForm.city.trim() || manualForm.locality.trim(),
      });
      setPreview(res.data);
      setPhase("preview");
    } catch {
      toast.error("Failed to calculate shipping");
    }
    setCalcLoading(false);
  };

  // ── Re-point the pin from the preview map ────────────────────────────────
  // Lets the user correct GPS/saved-address drift by tapping a new spot instead of
  // starting the whole flow over — recalculates shipping (district-aware) for wherever
  // they clicked, same as a fresh GPS detection would.
  const handleRepositionPin = async (lat: number, lng: number) => {
    if (!isWithinIndiaBoundingBox(lat, lng)) {
      toast.error("Please select a delivery location inside India.");
      return;
    }
    setRepositioning(true);
    try {
      const res = await api.post("/address/preview-shipping", { latitude: lat, longitude: lng });
      setPreview({ ...res.data, lat, lng });
      setPosition([lat, lng]);
      setLocMode("gps");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to recalculate shipping for that spot";
      toast.error(msg);
    } finally {
      setRepositioning(false);
    }
  };

  // ── Proceed to checkout ───────────────────────────────────────────────────

  const handleProceed = async () => {
    if (!preview) return;
    setIsProcessing(true);
    try {
      if (product) {
        const isInCart = cartItems.some(
          (i) => String(i.productId) === String(product.id) && String(i.variantId ?? "") === String(product.variantId ?? ""),
        );
        if (!isInCart) {
          await addToCart(product.id, { quantity: product.quantity ?? 1, variantId: product.variantId ?? null });
        }
      }

      if (locMode === "gps" && gpsCoords) {
        await api.post("/address/save-geo", { latitude: gpsCoords[0], longitude: gpsCoords[1] });
      } else if (locMode === "manual") {
        const addr = manualForm;
        const locality = addr.locality.trim();
        const street = addr.fullAddress.trim();
        const combinedAddress = street
          ? (locality && !street.toLowerCase().includes(locality.toLowerCase())
              ? `${street}, ${locality}`
              : street)
          : locality
            ? `${locality}, ${addr.city}, ${addr.state}`
            : `${addr.city}, ${addr.state}`;

        await api.post("/address/save-manual", {
          fullAddress: combinedAddress,
          city: addr.city || locality || addr.state,
          state: addr.state,
          zipCode: addr.zipCode || "000000",
        });
      }

      const manualLocality = manualForm.locality.trim();
      const manualStreet = manualForm.fullAddress.trim();
      const manualFull = manualStreet
        ? (manualLocality && !manualStreet.toLowerCase().includes(manualLocality.toLowerCase())
            ? `${manualStreet}, ${manualLocality}`
            : manualStreet)
        : manualLocality
          ? `${manualLocality}, ${manualForm.city}, ${manualForm.state}`
          : `${manualForm.city}, ${manualForm.state}`;

      const addressPrefill = {
        fullAddress: locMode === "gps"
          ? ""
          : locMode === "saved"
            ? (savedAddress?.fullAddress || `${savedAddress?.city}, ${savedAddress?.state}`)
            : manualFull,
        detectedArea: locMode === "gps" ? (preview.address || "") : (manualLocality || ""),
        city: locMode === "saved"
          ? (savedAddress?.city || "")
          : locMode === "gps"
            ? (preview.city || "")
            : (manualForm.city || manualLocality || ""),
        state: locMode === "saved"
          ? (savedAddress?.state || "")
          : locMode === "gps"
            ? (preview.state || "")
            : manualForm.state,
        zipCode: locMode === "saved"
          ? (savedAddress?.zipCode || "")
          : locMode === "gps"
            ? (preview.zipCode || "")
            : manualForm.zipCode,
        lat: position?.[0] ?? null,
        lng: position?.[1] ?? null,
        isGpsLocked: locMode === "gps",
      };

      onClose();
      navigate("/checkout", {
        state: {
          addressPrefill,
          shippingCharge: preview.shippingCharge,
          buyNowProductId: product?.id,
          buyNowVariantId: product?.variantId,
        },
      });
    } catch (err: any) {
      if (err?.message !== "Not authenticated") {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const goBackToSelect = () => {
    setPhase("select");
    setPreview(null);
    setLocMode(null);
    setPosition(null);
    setGpsCoords(null);
    setAddressError(null);
  };

  const estimatedTotal = orderSubtotal + (preview?.shippingCharge ?? 0);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[100]">
      {/* Backdrop */}
      <DialogBackdrop className="fixed inset-0 bg-[#172B2A]/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in" />

      {/* Centering wrapper */}
      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Modal Card */}
        <DialogPanel className="w-full max-w-lg bg-[#FAF8F2] shadow-2xl rounded-3xl flex flex-col max-h-[85vh] border border-[#E6DFD5] overflow-hidden text-[#172B2A] animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E6DFD5] bg-[#FAF8F2] sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {phase !== "select" ? (
                  <button
                    onClick={goBackToSelect}
                    className="p-2 rounded-xl text-[#4A5554] hover:text-[#172B2A] hover:bg-[#DDEDEA] transition-colors cursor-pointer"
                    aria-label="Go back"
                  >
                    <ChevronLeftIcon className="h-5 w-5 stroke-[2.5]" />
                  </button>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-[#DDEDEA] border border-[#D0E5E0] flex items-center justify-center text-[#0B6B6B]">
                    <TruckIcon className="h-5 w-5 stroke-[2]" />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-bold text-[#172B2A] tracking-tight">Delivery Location</h2>
                  <p className="text-xs text-[#4A5554] font-medium truncate max-w-[210px]">
                    {product ? product.name : `${cartItems.length} item${cartItems.length !== 1 ? "s" : ""} in cart`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#8C9896] hover:text-[#172B2A] hover:bg-[#DDEDEA] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="px-6 py-5 overflow-y-auto flex-1 bg-[#FAF8F2]/60">

            {/* ── PHASE: SELECT ── */}
            {phase === "select" && (
              <div className="space-y-3.5">
                <div className="mb-2">
                  <p className="text-sm font-semibold text-[#172B2A]">Where should we deliver?</p>
                  <p className="text-xs text-[#4A5554]">Select an address option to compute shipping costs.</p>
                </div>

                {/* 1. Manual Form Button (Enter Pincode & Address) */}
                <button
                  type="button"
                  onClick={() => { setLocMode("manual"); setPhase("manual_form"); }}
                  disabled={gpsLoading || calcLoading}
                  className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 bg-white shadow-2xs cursor-pointer active:scale-[0.99] ${
                    locMode === "manual"
                      ? "border-[#0B6B6B] ring-2 ring-[#0B6B6B]/15"
                      : "border-[#E4DCCE] hover:border-[#0B6B6B] hover:shadow-md"
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-[#DDEDEA] border border-[#D0E5E0] flex items-center justify-center shrink-0">
                    <PencilSquareIcon className="h-5 w-5 text-[#0B6B6B] stroke-[2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#172B2A] text-sm">Enter Pincode & Address</p>
                    <p className="text-xs text-[#4A5554] mt-0.5">Type in custom destination details</p>
                  </div>
                </button>

                {/* 2. Saved Address Button */}
                {savedAddress ? (
                  <button
                    type="button"
                    onClick={handleSelectSaved}
                    disabled={gpsLoading || calcLoading}
                    className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 bg-white shadow-2xs cursor-pointer active:scale-[0.99] ${
                      locMode === "saved"
                        ? "border-[#0B6B6B] ring-2 ring-[#0B6B6B]/15"
                        : "border-[#E4DCCE] hover:border-[#0B6B6B] hover:shadow-md"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#DDEDEA] border border-[#D0E5E0] flex items-center justify-center shrink-0">
                      {calcLoading && locMode === "saved" ? (
                        <BeatLoader size={5} color="#0B6B6B" />
                      ) : (
                        <HomeIcon className="h-5 w-5 text-[#0B6B6B] stroke-[2]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[#172B2A] text-sm">Saved Default Address</p>
                        <span className="text-[10px] font-bold text-[#0B6B6B] bg-[#DDEDEA] px-2 py-0.5 rounded-md border border-[#D0E5E0]">Default</span>
                      </div>
                      <p className="text-xs text-[#4A5554] mt-0.5 truncate font-medium">
                        {savedAddress.fullAddress || `${savedAddress.city}, ${savedAddress.state}`}
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="w-full flex items-center gap-4 rounded-2xl border border-dashed border-[#E4DCCE] bg-[#FAF8F2]/80 p-4 opacity-70 cursor-not-allowed">
                    <div className="w-11 h-11 rounded-xl bg-[#EFE8DB] flex items-center justify-center shrink-0">
                      <HomeIcon className="h-5 w-5 text-[#8C9896] stroke-[2]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#4A5554] text-sm">No Saved Address</p>
                      <p className="text-xs text-[#8C9896] mt-0.5">Add an address inside your profile settings</p>
                    </div>
                  </div>
                )}

                {/* 3. GPS Button (Current GPS Location) */}
                <button
                  type="button"
                  onClick={handleSelectGPS}
                  disabled={gpsLoading || calcLoading}
                  className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 bg-white shadow-2xs cursor-pointer active:scale-[0.99] ${
                    locMode === "gps"
                      ? "border-[#0B6B6B] ring-2 ring-[#0B6B6B]/15"
                      : "border-[#E4DCCE] hover:border-[#0B6B6B] hover:shadow-md"
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-[#DDEDEA] border border-[#D0E5E0] flex items-center justify-center shrink-0">
                    {gpsLoading ? (
                      <BeatLoader size={5} color="#0B6B6B" />
                    ) : (
                      <MapPinIcon className="h-5 w-5 text-[#0B6B6B] stroke-[2]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-[#172B2A] text-sm">Current GPS Location</p>
                      <span className="text-[10px] font-bold text-[#0B6B6B] bg-[#DDEDEA] px-2 py-0.5 rounded-md border border-[#D0E5E0]">Automatic</span>
                    </div>
                    <p className="text-xs text-[#4A5554] mt-0.5 truncate">Fastest • Detects location via device sensors</p>
                  </div>
                </button>
              </div>
            )}

            {/* ── PHASE: MANUAL FORM ── */}
            {phase === "manual_form" && (
              <div className="space-y-4">
                <div className="mb-1">
                  <p className="text-sm font-semibold text-[#172B2A]">Enter Delivery Details</p>
                  <p className="text-xs text-[#4A5554]">Provide pincode to auto-detect your area.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4A5554] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Pincode <span className="text-rose-500">*</span></span>
                    {pincodeLoading && <span className="text-[11px] normal-case font-normal text-[#0B6B6B]">Detecting area...</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={manualForm.zipCode}
                      onChange={handlePincodeChange}
                      placeholder="6-digit pincode"
                      maxLength={6}
                      className="w-full rounded-2xl border border-[#E4DCCE] bg-white px-4 py-3 text-sm text-[#172B2A] placeholder:text-[#8C9896] focus:border-[#0B6B6B] focus:ring-4 focus:ring-[#0B6B6B]/15 focus:outline-none transition shadow-2xs font-mono"
                    />
                    {pincodeLoading && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <BeatLoader size={5} color="#0B6B6B" />
                      </div>
                    )}
                  </div>
                  {pincodeError && (
                    <p className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl px-3 py-2 mt-2 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{pincodeError} — You can fill city and state manually below.</span>
                    </p>
                  )}
                </div>

                {/* Multiple Post Offices / Localities Custom Dropdown */}
                {availableLocalities.length > 1 && (
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-[#4A5554] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Locality / Post Office <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] font-normal normal-case text-[#0B6B6B]">Select exact area</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsLocalityDropdownOpen((prev) => !prev)}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm flex items-center justify-between transition-all shadow-2xs cursor-pointer text-left ${
                        isLocalityDropdownOpen
                          ? "border-[#0B6B6B] ring-4 ring-[#0B6B6B]/15 bg-white"
                          : "border-[#E4DCCE] bg-white hover:border-[#0B6B6B]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MapPinIcon className="h-4 w-4 text-[#0B6B6B] shrink-0" />
                        <span className={`truncate font-medium ${manualForm.locality ? "text-[#172B2A]" : "text-[#8C9896]"}`}>
                          {manualForm.locality || "-- Choose your Post Office / Area --"}
                        </span>
                      </div>
                      <ChevronDownIcon
                        className={`h-4 w-4 text-[#4A5554] shrink-0 transition-transform duration-200 ${
                          isLocalityDropdownOpen ? "rotate-180 text-[#0B6B6B]" : ""
                        }`}
                      />
                    </button>

                    {isLocalityDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setIsLocalityDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 mt-1.5 z-30 max-h-56 overflow-y-auto rounded-2xl border border-[#E4DCCE] bg-white p-1.5 shadow-xl">
                          {availableLocalities.map((loc) => {
                            const isSelected = manualForm.locality === loc;
                            return (
                              <button
                                key={loc}
                                type="button"
                                onClick={() => {
                                  setManualForm((f) => ({ ...f, locality: loc }));
                                  setIsLocalityDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer text-left ${
                                  isSelected
                                    ? "bg-[#E8F3F1] text-[#0B6B6B] font-bold"
                                    : "text-[#172B2A] hover:bg-[#FAF8F2] hover:text-[#0B6B6B]"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-[#0B6B6B]" : "bg-slate-300"}`} />
                                  <span className="truncate">{loc}</span>
                                </div>
                                {isSelected && (
                                  <CheckCircleIcon className="h-4 w-4 text-[#0B6B6B] shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Single Post Office Auto-selected badge */}
                {availableLocalities.length === 1 && (
                  <div className="flex items-center gap-2 bg-[#E8F3F1] border border-[#0B6B6B]/25 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#0B6B6B]">
                    <CheckCircleIcon className="w-4 h-4 shrink-0 text-[#0B6B6B]" />
                    <span>Area: <strong>{manualForm.locality}</strong></span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-[#4A5554] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Full Address <span className="text-rose-500">*</span></span>
                    {!manualForm.fullAddress.trim() && manualForm.zipCode.length === 6 && (
                      <span className="text-[10px] normal-case text-amber-600 font-medium">Required for delivery</span>
                    )}
                  </label>
                  <textarea
                    ref={addressInputRef}
                    value={manualForm.fullAddress}
                    onChange={(e) => {
                      setManualForm((f) => ({ ...f, fullAddress: e.target.value }));
                      if (addressError) setAddressError(null);
                    }}
                    placeholder="Flat / House No., Street Name, Area..."
                    rows={3}
                    className={`w-full min-h-[80px] rounded-2xl border px-4 py-2.5 text-sm leading-relaxed text-[#172B2A] placeholder:text-[#8C9896] focus:outline-none transition resize-y shadow-2xs ${
                      addressError
                        ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50/20"
                        : "border-[#E4DCCE] bg-white focus:border-[#0B6B6B] focus:ring-4 focus:ring-[#0B6B6B]/15"
                    }`}
                  />
                  {addressError && (
                    <p className="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
                      <span>•</span> {addressError}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4A5554] uppercase tracking-wider mb-1.5">City / District</label>
                    <input
                      type="text"
                      value={manualForm.city}
                      onChange={(e) => setManualForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="City / District"
                      className="w-full rounded-xl border border-[#E4DCCE] bg-white px-3.5 py-2.5 text-xs text-[#172B2A] font-medium focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4A5554] uppercase tracking-wider mb-1.5">State</label>
                    <input
                      type="text"
                      value={manualForm.state}
                      onChange={(e) => setManualForm((f) => ({ ...f, state: e.target.value }))}
                      placeholder="State"
                      className="w-full rounded-xl border border-[#E4DCCE] bg-white px-3.5 py-2.5 text-xs text-[#172B2A] font-medium focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualCalculate}
                  disabled={
                    calcLoading ||
                    !manualForm.zipCode.trim() ||
                    manualForm.zipCode.trim().length < 6
                  }
                  className="w-full rounded-2xl bg-[#0B6B6B] hover:bg-[#084E4E] active:scale-[0.99] py-3.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0B6B6B] disabled:active:scale-100 transition-all flex items-center justify-center gap-2 mt-3 shadow-md cursor-pointer"
                >
                  {calcLoading ? (
                    <BeatLoader size={6} color="#fff" />
                  ) : (
                    <>
                      <TruckIcon className="h-4 w-4 stroke-[2]" />
                      Calculate Rates
                      <ArrowRightIcon className="h-3.5 w-3.5 stroke-[2]" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── PHASE: PREVIEW ── */}
            {phase === "preview" && preview && (
              <div className="space-y-4">
                {/* Map — click/drag to re-point the pin and recalculate shipping */}
                {position && (
                  <div className="rounded-2xl overflow-hidden border border-[#E4DCCE] shadow-xs relative" style={{ height: 170 }}>
                    <MapContainer
                      center={position}
                      zoom={15}
                      minZoom={4}
                      maxBounds={INDIA_BOUNDS}
                      maxBoundsViscosity={1.0}
                      style={{ height: "100%", width: "100%", cursor: repositioning ? "wait" : "pointer" }}
                      zoomControl={!repositioning}
                      dragging={!repositioning}
                      doubleClickZoom={!repositioning}
                      scrollWheelZoom={!repositioning}
                      touchZoom={!repositioning}
                      boxZoom={false}
                      keyboard={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                      <Marker position={position} icon={customIcon} />
                      <MapRecenter center={position} />
                      {!repositioning && <MapClickHandler onPick={handleRepositionPin} />}
                    </MapContainer>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-[#E4DCCE] rounded-full px-3 py-1 text-[10px] font-medium text-[#4A5554] shadow-xs pointer-events-none z-[1000]">
                      {repositioning ? "Recalculating…" : "Tap the map to move the pin"}
                    </div>
                    {repositioning && (
                      <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[999]">
                        <BeatLoader size={6} color="#0B6B6B" />
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery summary card */}
                <div className="flex items-start gap-3 bg-white rounded-2xl border border-[#E4DCCE] p-3.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-[#DDEDEA] border border-[#D0E5E0] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPinIcon className="h-4 w-4 text-[#0B6B6B] stroke-[2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-[#8C9896] uppercase tracking-wider">Destination</p>
                    {locMode === "saved" && savedAddress ? (
                      <>
                        <p className="text-xs font-semibold text-[#172B2A] mt-0.5 break-words">
                          {savedAddress.fullAddress || `${savedAddress.city}, ${savedAddress.state} ${savedAddress.zipCode}`}
                        </p>
                        <p className="text-[11px] text-[#4A5554] mt-0.5">{savedAddress.city}, {savedAddress.state} — {savedAddress.zipCode}</p>
                      </>
                    ) : locMode === "gps" ? (
                      <>
                        <p className="text-xs font-semibold text-[#172B2A] mt-0.5 break-words">
                          {preview.address || "Current Location Detected"}
                        </p>
                        {preview.state && <p className="text-[11px] text-[#4A5554] mt-0.5">{preview.state}</p>}
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-[#172B2A] mt-0.5 break-words">
                          {manualForm.fullAddress || `${manualForm.city}, ${manualForm.state}`}
                        </p>
                        <p className="text-[11px] text-[#4A5554] mt-0.5">{manualForm.city}, {manualForm.state} — {manualForm.zipCode}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Order summary breakdown */}
                <div className="rounded-2xl border border-[#E4DCCE] bg-white shadow-2xs overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#FAF8F2] border-b border-[#E6DFD5] flex items-center justify-between">
                    <p className="text-[11px] font-bold text-[#4A5554] uppercase tracking-wider">Order Summary</p>
                    <ShieldCheckIcon className="h-4 w-4 text-[#0B6B6B]" />
                  </div>
                  <div className="p-4 space-y-2.5 text-xs">
                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {orderLines.map((line, i) => (
                        <div key={i} className="flex justify-between items-center text-[#4A5554]">
                          <span className="truncate pr-2 font-medium">
                            {line.name} {line.quantity > 1 ? `(x${line.quantity})` : ""}
                          </span>
                          <span className="font-semibold text-[#172B2A] shrink-0">
                            ₹{(line.price * line.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-start text-[#4A5554] pt-1 border-t border-[#E6DFD5]">
                      <div>
                        <span className="font-medium">Shipping Fee</span>
                        <p className="text-[10px] text-[#8C9896] mt-0.5 max-w-[200px]">{preview.label}</p>
                      </div>
                      <span className={`font-bold shrink-0 ${preview.shippingCharge === 0 ? "text-[#0B6B6B]" : "text-[#172B2A]"}`}>
                        {preview.shippingCharge === 0 ? "FREE" : `₹${preview.shippingCharge}`}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-[#E6DFD5]">
                      <span className="font-bold text-[#172B2A] text-sm">Estimated Total</span>
                      <span className="font-bold text-base text-[#172B2A]">₹{estimatedTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-[#FAF8F2] px-4 py-2 border-t border-[#E6DFD5]">
                    <p className="text-[10px] font-medium text-[#4A5554] leading-tight">
                      * Final total includes all cart items. Delivery charge confirmed at final step.
                    </p>
                  </div>
                </div>

                {/* Proceed Action Button */}
                <button
                  onClick={handleProceed}
                  disabled={isProcessing}
                  className="w-full rounded-2xl bg-[#0B6B6B] hover:bg-[#084E4E] active:scale-[0.99] py-3.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <BeatLoader size={6} color="#fff" />
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4 stroke-[2]" />
                      <span>Proceed to Checkout</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}