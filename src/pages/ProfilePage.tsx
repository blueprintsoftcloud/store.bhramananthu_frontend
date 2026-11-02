import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import {
  User,
  Mail,
  ArrowLeft,
  LogOut,
  ShoppingBag,
  Heart,
  Edit2,
  KeyRound,
  CreditCard,
  Phone,
} from "lucide-react";

interface Profile {
  username: string;
  email: string;
  phone?: string;
  role?: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { checkAuthStatus, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [formData, setFormData] = useState({ newUsername: "", newEmail: "", newPhone: "" });
  const [isEditing, setIsEditing] = useState(false);

  // OTP States
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get("/user/profile");
        if (!res.data || !res.data.users) throw new Error("Invalid response");

        const data = res.data.users;
        setProfile(data);
        setFormData({
          newUsername: data.username || "",
          newEmail: data.email || "",
          newPhone: data.phone || "",
        });
      } catch (err) {
        const e = err as any;
        if (e.response?.status === 401) {
          toast("Please log in.");
          setTimeout(() => navigate("/"), 1500);
        } else {
          toast.error("Failed to load profile.");
        }
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name.toLowerCase().includes("email") ? value.toLowerCase() : value }));
  };

  const handleRequestUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { newUsername, newEmail, newPhone } = formData;

    if (!newUsername.trim() || !newEmail.trim())
      return void toast("Fill all required fields.");
    if (
      profile &&
      newUsername === profile.username &&
      newEmail === profile.email &&
      (newPhone || "") === (profile.phone || "")
    )
      return void toast("No changes detected.");

    try {
      setRequestingOtp(true);
      const res = await api.post("/user/profile/request-update", {
        newEmail,
        newUsername,
        newPhone: newPhone.trim() || undefined,
      });
      toast.success(res.data?.message || `OTP sent to ${newEmail}`);
      setOtpRequested(true);
    } catch (err) {
      const e = err as any;
      toast.error(e.response?.data?.message || "Update failed.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return void toast("Enter OTP.");

    try {
      setVerifyingOtp(true);
      const res = await api.post("/user/profile/verify-update", {
        otp: otp.trim(),
      });
      toast.success("Profile updated successfully!");

      if (res.data?.user) {
        setProfile(res.data.user);
        setFormData({
          newUsername: res.data.user.username,
          newEmail: res.data.user.email,
          newPhone: res.data.user.phone || "",
        });
      }
      if (checkAuthStatus) checkAuthStatus();
      setOtp("");
      setOtpRequested(false);
      setIsEditing(false);
    } catch (err) {
      const e = err as any;
      toast.error(e.response?.data?.message || "Invalid OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loadingProfile) {
    return <Loader message="Loading profile..." fullScreen={false} className="pt-(--app-header-h) min-h-screen" />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F2] p-4 text-[#172B2A] pt-(--app-header-h)">
        <h2 className="text-2xl font-serif font-bold text-[#172B2A] mb-2">
          Profile Unavailable
        </h2>
        <p className="text-sm text-[#4A5554] mb-6">
          Could not load your account information.
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-8 py-3 bg-[#0B6B6B] hover:bg-[#084E4E] text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F2] font-sans text-[#172B2A] pt-(--app-header-h) pb-16 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#0B6B6B]/10 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8">
        {/* --- Header & Back Button --- */}
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
                My Profile
              </h1>
              <p className="text-sm text-[#34504D] mt-0.5">
                Manage your personal details and account preferences
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ================= LEFT: IDENTITY CARD ================= */}
          <div className="lg:col-span-4 space-y-6">
            {/* Main Profile Identity Card */}
            <div className="bg-white rounded-3xl p-7 shadow-xs border border-[#E6DFD5] text-center relative overflow-hidden">
              {/* Card top banner background */}
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[#DDEDEA] to-[#FAF8F2] z-0" />

              <div className="relative z-10 pt-2">
                {/* Avatar Badge */}
                <div className="w-24 h-24 mx-auto rounded-full bg-white p-1 shadow-md mb-3.5">
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#0B6B6B] to-[#084E4E] text-white flex items-center justify-center text-3xl font-serif font-bold uppercase tracking-wider shadow-inner">
                    {profile.username.charAt(0)}
                  </div>
                </div>

                <h2 className="text-2xl font-serif font-bold text-[#172B2A]">
                  {profile.username}
                </h2>
                <p className="text-xs text-[#4A5554] font-medium mt-0.5">
                  {profile.email}
                </p>
                {profile.phone && (
                  <p className="text-xs text-[#0B6B6B] font-semibold mt-1 flex items-center justify-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span>+91 {profile.phone}</span>
                  </p>
                )}

              </div>
            </div>

            {/* Quick Actions Navigation Menu */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-[#E6DFD5]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A5554] mb-3 px-2">
                Quick Menu
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/myorders")}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8F2] hover:bg-[#DDEDEA] text-[#172B2A] hover:text-[#0B6B6B] border border-[#E6DFD5] transition-all duration-200 group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-4.5 h-4.5 text-[#0B6B6B]" />
                    <span className="font-bold text-xs sm:text-sm">My Orders</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-[#8C9896] group-hover:text-[#0B6B6B] group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => navigate("/transactions")}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8F2] hover:bg-[#DDEDEA] text-[#172B2A] hover:text-[#0B6B6B] border border-[#E6DFD5] transition-all duration-200 group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4.5 h-4.5 text-[#0B6B6B]" />
                    <span className="font-bold text-xs sm:text-sm">Transaction History</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-[#8C9896] group-hover:text-[#0B6B6B] group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={() => navigate("/WishlistPage")}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF8F2] hover:bg-[#DDEDEA] text-[#172B2A] hover:text-[#0B6B6B] border border-[#E6DFD5] transition-all duration-200 group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-4.5 h-4.5 text-[#0B6B6B]" />
                    <span className="font-bold text-xs sm:text-sm">Wishlist</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-[#8C9896] group-hover:text-[#0B6B6B] group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/80 hover:bg-rose-100 text-rose-600 border border-rose-100 transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4.5 h-4.5 text-rose-600" />
                    <span className="font-bold text-xs sm:text-sm">Sign Out</span>
                  </div>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-rose-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          </div>

          {/* ================= RIGHT: ACCOUNT DETAILS / EDIT FORM ================= */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl p-6 sm:p-9 shadow-xs border border-[#E6DFD5] h-full">
              <div className="flex items-center justify-between mb-8 border-b border-[#E6DFD5] pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#DDEDEA] text-[#0B6B6B] flex items-center justify-center border border-[#D0E5E0]">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-bold text-[#172B2A]">
                      {isEditing ? "Edit Account Details" : "Account Information"}
                    </h2>
                    <p className="text-xs text-[#4A5554] mt-0.5">
                      {isEditing ? "Update your personal credentials" : "Your registered profile parameters"}
                    </p>
                  </div>
                </div>
              </div>

              {!otpRequested ? (
                !isEditing ? (
                  /* ── Read-only view ── */
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="bg-[#FAF8F2] border border-[#E4DCCE] rounded-2xl p-4 space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B6B]">Display Name</p>
                        <div className="flex items-center gap-2.5 pt-0.5">
                          <User className="h-4.5 w-4.5 text-[#8C9896]" />
                          <span className="font-bold text-sm text-[#172B2A]">{profile.username}</span>
                        </div>
                      </div>

                      <div className="bg-[#FAF8F2] border border-[#E4DCCE] rounded-2xl p-4 space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B6B]">Email Address</p>
                        <div className="flex items-center gap-2.5 pt-0.5">
                          <Mail className="h-4.5 w-4.5 text-[#8C9896]" />
                          <span className="font-bold text-sm text-[#172B2A]">{profile.email}</span>
                        </div>
                      </div>

                      <div className="bg-[#FAF8F2] border border-[#E4DCCE] rounded-2xl p-4 space-y-1 md:col-span-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0B6B6B]">Mobile Number</p>
                        <div className="flex items-center gap-2.5 pt-0.5">
                          <Phone className="h-4.5 w-4.5 text-[#8C9896]" />
                          <span className="font-bold text-sm text-[#172B2A]">
                            {profile.phone ? `+91 ${profile.phone}` : <span className="text-[#8C9896] font-normal">Not provided</span>}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0B6B6B] hover:bg-[#084E4E] text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit Profile</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Edit Form ── */
                  <form onSubmit={handleRequestUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Username Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#34504D] ml-1">
                          Display Name *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#8C9896]" />
                          <input
                            name="newUsername"
                            type="text"
                            value={formData.newUsername}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-[#FAF8F2] focus:bg-white border border-[#E4DCCE] focus:border-[#0B6B6B] focus:ring-4 focus:ring-[#0B6B6B]/15 text-[#172B2A] placeholder:text-[#8C9896] rounded-2xl text-xs font-medium transition-all shadow-2xs outline-none"
                            placeholder="Your full name"
                            required
                          />
                        </div>
                      </div>

                      {/* Email Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#34504D] ml-1">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#8C9896]" />
                          <input
                            name="newEmail"
                            type="email"
                            value={formData.newEmail}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 py-3 bg-[#FAF8F2] focus:bg-white border border-[#E4DCCE] focus:border-[#0B6B6B] focus:ring-4 focus:ring-[#0B6B6B]/15 text-[#172B2A] placeholder:text-[#8C9896] rounded-2xl text-xs font-medium transition-all shadow-2xs outline-none"
                            placeholder="Your email address"
                            required
                          />
                        </div>
                      </div>

                      {/* Phone Input */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-[#34504D] ml-1">
                          Mobile Number (10 digits)
                        </label>
                        <div className="relative flex items-stretch border border-[#E4DCCE] focus-within:border-[#0B6B6B] focus-within:ring-4 focus-within:ring-[#0B6B6B]/15 rounded-2xl bg-white overflow-hidden shadow-2xs">
                          <div className="flex items-center gap-1 px-3.5 bg-[#FAF8F2] border-r border-[#E4DCCE] text-xs font-bold text-[#172B2A] select-none shrink-0">
                            <Phone className="w-3.5 h-3.5 text-[#0B6B6B]" />
                            +91
                          </div>
                          <input
                            name="newPhone"
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={formData.newPhone}
                            onChange={handleChange}
                            className="flex-1 min-w-0 px-3 py-3 text-xs font-medium text-[#172B2A] placeholder:text-[#8C9896] outline-none bg-transparent"
                            placeholder="10-digit mobile number"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-[#E6DFD5]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setFormData({
                            newUsername: profile.username,
                            newEmail: profile.email,
                            newPhone: profile.phone || "",
                          });
                        }}
                        className="px-6 py-3.5 border border-[#DFD6C5] rounded-2xl text-xs font-bold uppercase tracking-wider text-[#172B2A] hover:bg-[#EFE8DB] transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={requestingOtp}
                        className="px-8 py-3.5 bg-[#0B6B6B] hover:bg-[#084E4E] text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
                      >
                        {requestingOtp ? "Sending OTP..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                )
              ) : (
                /* ── OTP Verification Step ── */
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md mx-auto py-8 text-center">
                  <div className="w-18 h-18 rounded-full bg-[#DDEDEA] border border-[#D0E5E0] text-[#0B6B6B] flex items-center justify-center mx-auto mb-5 shadow-xs">
                    <KeyRound className="w-9 h-9" />
                  </div>

                  <h3 className="text-2xl font-serif font-bold text-[#172B2A] mb-2">
                    Verify Email Update
                  </h3>
                  <p className="text-[#4A5554] text-xs mb-6">
                    A 6-digit security code has been sent to{" "}
                    <span className="font-bold text-[#172B2A]">
                      {formData.newEmail}
                    </span>
                  </p>

                  <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      className="w-full text-center text-3xl font-bold tracking-[0.4em] py-3.5 rounded-2xl border-2 border-[#E4DCCE] focus:border-[#0B6B6B] focus:ring-4 focus:ring-[#0B6B6B]/15 bg-white text-[#172B2A] outline-none shadow-xs"
                      placeholder="000000"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={verifyingOtp}
                      className="w-full py-3.5 bg-[#0B6B6B] hover:bg-[#084E4E] text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer"
                    >
                      {verifyingOtp ? "Verifying..." : "Confirm & Update"}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => setOtpRequested(false)}
                    className="mt-5 text-xs font-bold text-[#8C9896] hover:text-[#172B2A] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel Verification
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
