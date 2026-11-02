// src/dashboard/EditOrderAddressModal.tsx
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import api from "../utils/api";
import { fetchPincodeDetails } from "../utils/pincodeLookup";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

interface EditOrderAddressModalProps {
  order: any | null;
  onClose: () => void;
  onSuccess: (updatedOrder: any) => void;
}

export default function EditOrderAddressModal({
  order,
  onClose,
  onSuccess,
}: EditOrderAddressModalProps) {
  useBodyScrollLock(!!order);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [fullAddress, setFullAddress] = useState("");

  const [availableLocalities, setAvailableLocalities] = useState<string[]>([]);
  const [isLocalityDropdownOpen, setIsLocalityDropdownOpen] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!order) return;
    const sa = order.shippingAddress || {};
    setFullName(sa.fullName || sa.name || order.user?.username || "");
    setPhone(sa.phone || order.user?.phone || "");
    setSecondaryPhone(sa.secondaryPhone || "");
    setZipCode(sa.zipCode || "");
    setLocality(sa.locality || "");
    setCity(sa.city || "");
    setState(sa.state || "");
    setFullAddress(sa.fullAddress || "");
    setAvailableLocalities(sa.locality ? [sa.locality] : []);
  }, [order]);

  if (!order) return null;

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cleanPin = val.replace(/\D/g, "").slice(0, 6);
    setZipCode(cleanPin);
    setPincodeError(null);

    if (cleanPin.length < 6) {
      setAvailableLocalities([]);
      return;
    }

    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      try {
        const result = await fetchPincodeDetails(cleanPin);
        if (result.success) {
          setCity((prev) => result.city || prev);
          setState((prev) => result.state || prev);
          setAvailableLocalities(result.localities);
          setPincodeError(null);

          if (result.localities.length === 1) {
            setLocality(result.localities[0]);
            setIsLocalityDropdownOpen(false);
            toast.success(`Resolved: ${result.localities[0]}, ${result.city}`);
          } else {
            setIsLocalityDropdownOpen(true);
            toast.success(`Resolved: ${result.city}, ${result.state}. Select locality.`);
          }
        } else {
          setAvailableLocalities([]);
          setPincodeError(result.error || "Pincode not found");
        }
      } catch (err) {
        setPincodeError("Unable to verify pincode");
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Receiver name is required");
      return;
    }
    if (!phone.trim()) {
      toast.error("Contact phone number is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put(`/order/${order.id}/shipping-address`, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        secondaryPhone: secondaryPhone.trim(),
        zipCode: zipCode.trim(),
        locality: locality.trim(),
        city: city.trim(),
        state: state.trim(),
        fullAddress: fullAddress.trim(),
      });

      toast.success("Shipping details updated successfully!");
      onSuccess(res.data.order);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update shipping address");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-slate-50 border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DDEDEA] border border-[#D0E5E0] text-[#0B6B6B] flex items-center justify-center shrink-0">
              <MapPinIcon className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Shipping Details</h3>
              <p className="text-xs text-slate-500 font-medium">
                Order #{order.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            title="Close"
          >
            <XMarkIcon className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Scrollable Fields */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Receiver Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-[#0B6B6B]" />
              <span>Receiver Name <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Customer Full Name"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 focus:outline-none transition"
              required
            />
          </div>

          {/* Contact Numbers Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 text-[#0B6B6B]" />
                <span>Primary Mobile <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile"
                maxLength={10}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 focus:outline-none transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Secondary Phone</span>
              </label>
              <input
                type="tel"
                value={secondaryPhone}
                onChange={(e) => setSecondaryPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Alternate phone (optional)"
                maxLength={10}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Pincode & Locality Selection */}
          <div className="space-y-3.5 pt-1 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <BuildingOffice2Icon className="w-3.5 h-3.5 text-[#0B6B6B]" />
                  <span>Pincode <span className="text-rose-500">*</span></span>
                </label>
                {pincodeLoading && (
                  <span className="text-[11px] text-[#0B6B6B] font-medium flex items-center gap-1">
                    <BeatLoader size={4} color="#0B6B6B" /> Detecting...
                  </span>
                )}
              </div>
              <input
                type="text"
                value={zipCode}
                onChange={handlePincodeChange}
                placeholder="6-digit PIN code"
                maxLength={6}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 focus:outline-none transition"
                required
              />
              {pincodeError && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1.5">
                  ⚠️ {pincodeError}
                </p>
              )}
            </div>

            {/* Post Office / Locality Dropdown or Input */}
            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Post Office / Locality</span>
                {availableLocalities.length > 1 && (
                  <span className="text-[10px] text-[#0B6B6B] font-normal normal-case">
                    {availableLocalities.length} post offices under this PIN
                  </span>
                )}
              </label>

              {availableLocalities.length > 1 ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLocalityDropdownOpen((prev) => !prev)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm flex items-center justify-between transition bg-white text-left cursor-pointer ${
                      isLocalityDropdownOpen
                        ? "border-[#0B6B6B] ring-2 ring-[#0B6B6B]/15"
                        : "border-slate-200 hover:border-[#0B6B6B]"
                    }`}
                  >
                    <span className={`truncate font-medium ${locality ? "text-slate-900" : "text-slate-400"}`}>
                      {locality || "-- Select Post Office / Area --"}
                    </span>
                    <ChevronDownIcon
                      className={`w-4 h-4 text-slate-400 transition-transform ${
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
                      <div className="absolute left-0 right-0 mt-1 z-30 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                        {availableLocalities.map((loc) => {
                          const isSelected = locality === loc;
                          return (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => {
                                setLocality(loc);
                                setIsLocalityDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer text-left ${
                                isSelected
                                  ? "bg-[#E8F3F1] text-[#0B6B6B] font-bold"
                                  : "text-slate-800 hover:bg-slate-50 hover:text-[#0B6B6B]"
                              }`}
                            >
                              <span className="truncate">{loc}</span>
                              {isSelected && <CheckCircleIcon className="w-4 h-4 text-[#0B6B6B] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="Post Office name (e.g. Ayathil)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 focus:outline-none transition"
                />
              )}
            </div>

            {/* City & State */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">City / District</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Street Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
              <span>Street / Full Address</span>
              <span className="text-[11px] font-normal normal-case text-slate-400">House No., building, street, landmark</span>
            </label>
            <textarea
              rows={4}
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              placeholder="Door / Flat No., Building Name, Street, Landmark..."
              className="w-full min-h-[105px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-[#0B6B6B] focus:ring-2 focus:ring-[#0B6B6B]/15 focus:outline-none transition resize-y"
            />
          </div>
          </div>

          {/* Sticky Action Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B6B6B] hover:bg-[#084E4E] text-white text-xs font-bold transition shadow-md shadow-[#0B6B6B]/20 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <BeatLoader size={5} color="#ffffff" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
