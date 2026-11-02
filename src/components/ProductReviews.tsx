import React, { useState, useEffect, useCallback } from "react";
import {
  Star,
  Edit3,
  Trash2,
  MessageSquare,
  AlertCircle,
  X,
} from "lucide-react";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  variantId: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email?: string;
    avatar?: string | null;
  };
}

export interface ReviewStats {
  reviews: ReviewItem[];
  total: number;
  avg: number;
  distribution: Array<{ star: number; count: number }>;
}

interface ProductReviewsProps {
  productId: string;
  productName?: string;
  activeVariantId?: string | null;
  onRatingUpdate?: (stats: { rating: number; numReviews: number }) => void;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Poor — Did not meet expectations",
  2: "Fair — Needs improvement",
  3: "Good — Satisfactory results",
  4: "Very Good — Highly effective",
  5: "Excellent — Outstanding relief & quality",
};

export default function ProductReviews({
  productId,
  productName = "Bhramananthu Oil",
  activeVariantId = null,
  onRatingUpdate,
}: ProductReviewsProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReviewStats>({
    reviews: [],
    total: 0,
    avg: 0,
    distribution: [
      { star: 5, count: 0 },
      { star: 4, count: 0 },
      { star: 3, count: 0 },
      { star: 2, count: 0 },
      { star: 1, count: 0 },
    ],
  });

  const [myReview, setMyReview] = useState<ReviewItem | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canReview, setCanReview] = useState<boolean>(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formHoverRating, setFormHoverRating] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch public reviews for this product
  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await api.get<ReviewStats>(`/reviews/${productId}`);
      if (res.data) {
        setStats(res.data);
        if (onRatingUpdate) {
          onRatingUpdate({
            rating: res.data.avg,
            numReviews: res.data.total,
          });
        }
      }
    } catch (err: any) {
      // 403 means reviews feature disabled, or product not found
      if (err.response?.status !== 403) {
        console.error("Error fetching reviews:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [productId, onRatingUpdate]);

  // 2. Fetch current user's review & eligibility
  const fetchMyReview = useCallback(async () => {
    if (!productId || !user.isAuthenticated) {
      setMyReview(null);
      setCurrentUserId(null);
      return;
    }
    try {
      const queryParam = activeVariantId ? `?variantId=${encodeURIComponent(activeVariantId)}` : "";
      const res = await api.get<{ review: ReviewItem | null; canReview: boolean; currentUserId?: string }>(
        `/reviews/my/${productId}${queryParam}`
      );
      if (res.data) {
        setMyReview(res.data.review);
        setCanReview(res.data.canReview ?? true);
        if (res.data.currentUserId) {
          setCurrentUserId(res.data.currentUserId);
        }
      }
    } catch (err) {
      // User may not be logged in or session expired
      setMyReview(null);
    }
  }, [productId, activeVariantId, user.isAuthenticated]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchMyReview();
  }, [fetchMyReview]);

  // Handle "Write Review" click
  const handleOpenWriteForm = () => {
    if (!user.isAuthenticated) {
      toast("Please sign in to share your review.", {
        id: "auth-review-needed",
      });
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }

    if (myReview) {
      // Edit existing review
      setFormRating(myReview.rating);
      setFormComment(myReview.comment || "");
      setIsEditing(true);
    } else {
      // Create new review
      setFormRating(5);
      setFormComment("");
      setIsEditing(false);
    }
    setIsFormOpen(true);
  };

  // Close form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setIsEditing(false);
    setFormRating(5);
    setFormComment("");
    setFormHoverRating(0);
  };

  // Submit Review (Create or Update)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.isAuthenticated) {
      window.dispatchEvent(new CustomEvent("openCustomerAuth"));
      return;
    }

    if (!formRating || formRating < 1 || formRating > 5) {
      toast.error("Please select a rating between 1 and 5 stars.", { id: "invalid-rating" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && myReview) {
        // Update existing review
        await api.patch(`/reviews/${myReview.id}`, {
          rating: formRating,
          comment: formComment.trim() || undefined,
        });
        toast.success("Your review has been updated!", {
          id: "review-updated-toast",
        });
      } else {
        // Create new review
        await api.post(`/reviews/${productId}`, {
          rating: formRating,
          comment: formComment.trim() || undefined,
          variantId: activeVariantId || undefined,
        });
        toast.success("Thank you! Your review has been published.", {
          id: "review-created-toast",
        });
      }

      handleCloseForm();
      await Promise.all([fetchReviews(), fetchMyReview()]);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to submit review. Please try again.";
      toast.error(msg, { id: "review-submit-error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete review
  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/reviews/${reviewToDelete}`);
      toast.success("Review deleted successfully.", {
        id: "review-deleted-toast",
      });
      setReviewToDelete(null);
      setMyReview(null);
      handleCloseForm();
      await Promise.all([fetchReviews(), fetchMyReview()]);
    } catch (err: any) {
      console.error("Failed to delete review:", err);
      const msg = err.response?.data?.message || "Failed to delete review.";
      toast.error(msg, { id: "review-delete-error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const displayReviews = stats.reviews;

  const activeStarCount = formHoverRating || formRating;
  const isPrivileged =
    user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  return (
    <section
      id="reviews"
      className="scroll-mt-[calc(var(--app-header-h,120px)+20px)] py-16 sm:py-24 bg-[#FAF8F2] border-t border-[#E8DFC8]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ================= SECTION HEADER ================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 text-left">
          <div>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#172B2A] tracking-tight">
              Customer Reviews
            </h2>
            <p className="text-[#4A5A58] text-base sm:text-lg mt-2 max-w-2xl leading-relaxed">
              Read real feedback from customers who use {productName} for ear balance, vertigo, head heaviness, and restful sleep.
            </p>
          </div>

          {/* Write / Edit Review Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleOpenWriteForm}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#0B6B6B] hover:bg-[#085555] active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl transition-all shadow-md cursor-pointer"
            >
              {myReview ? (
                <>
                  <Edit3 className="w-4 h-4 stroke-[2.5]" />
                  <span>Edit your review</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                  <span>Write a review</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================= WRITE / EDIT REVIEW FORM ACCORDION ================= */}
        {isFormOpen && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-[#0B6B6B]/40 shadow-md mb-8 transition-all animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-[#EFE8DE] mb-6">
              <div>
                <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#172B2A]">
                  {isEditing ? "Edit Your Review" : "Write a Customer Review"}
                </h3>
                <p className="text-xs sm:text-sm text-[#4A5A58] mt-0.5">
                  Share your honest experience with {productName}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-[#172B2A] hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close review form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-6">
              {/* Star Rating Selector */}
              <div>
                <label className="block text-sm font-bold text-[#172B2A] mb-2">
                  Overall Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= activeStarCount;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        onMouseEnter={() => setFormHoverRating(star)}
                        onMouseLeave={() => setFormHoverRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-115 active:scale-95 cursor-pointer"
                        aria-label={`${star} star`}
                      >
                        <Star
                          className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                            isFilled
                              ? "fill-[#F59E0B] text-[#F59E0B]"
                              : "fill-none text-[#D9D2C5]"
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-sm font-bold text-[#0B6B6B] ml-3 hidden sm:inline">
                    {RATING_DESCRIPTIONS[activeStarCount] || ""}
                  </span>
                </div>
                <div className="sm:hidden mt-1 text-xs font-bold text-[#0B6B6B]">
                  {RATING_DESCRIPTIONS[activeStarCount] || ""}
                </div>
              </div>

              {/* Review Comment Textarea */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="review-comment-input"
                    className="block text-sm font-bold text-[#172B2A]"
                  >
                    Your Review & Experience
                  </label>
                  <span className="text-xs text-[#718280]">
                    {formComment.length} / 1000 characters
                  </span>
                </div>
                <textarea
                  id="review-comment-input"
                  maxLength={1000}
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="How did Bhramananthu Oil help you? Mention symptoms relieved (vertigo, ear ringing, dizziness, sleep quality), how often you used it, and your results."
                  className="w-full h-32 sm:h-36 resize-none no-scrollbar px-4 py-3 rounded-xl border border-[#D1DCDA] bg-[#FAF8F2] text-[#172B2A] placeholder:text-[#8A9B98] text-sm sm:text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B6B6B] focus:border-transparent transition-all [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl border border-[#D1DCDA] bg-white text-[#172B2A] font-bold text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-2.5 rounded-xl bg-[#0B6B6B] hover:bg-[#085555] active:scale-[0.99] text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center min-w-[130px] cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <BeatLoader size={6} color="#ffffff" />
                  ) : isEditing ? (
                    "Update Review"
                  ) : (
                    "Submit Review"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= USER'S OWN REVIEW HIGHLIGHT (If existing and not editing) ================= */}
        {myReview && !isFormOpen && (
          <div className="bg-[#F4F9F8] rounded-2xl p-4 sm:p-7 border-2 border-[#0B6B6B]/40 shadow-xs mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                {/* Header: Badge, Stars & Date */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                  <div className="flex items-center justify-between sm:justify-start gap-2.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#0B6B6B] text-white whitespace-nowrap">
                      Your Submitted Review
                    </span>
                    <span className="text-xs text-[#718280] whitespace-nowrap sm:hidden">
                      {new Date(myReview.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-2.5">
                    <div className="flex items-center gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= myReview.rating
                              ? "fill-[#F59E0B] text-[#F59E0B]"
                              : "fill-none text-[#D9D2C5]"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-[#718280] whitespace-nowrap hidden sm:inline">
                      {new Date(myReview.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {myReview.comment?.trim() && (
                  <p className="text-sm sm:text-base text-[#2D3E3C] leading-relaxed mt-2 whitespace-pre-line font-body break-words">
                    {myReview.comment}
                  </p>
                )}
              </div>

              {/* Edit / Delete User Actions */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={handleOpenWriteForm}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0B6B6B]/40 bg-white text-[#0B6B6B] hover:bg-[#0B6B6B]/5 text-xs font-bold transition-colors cursor-pointer"
                  title="Edit your review"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewToDelete(myReview.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                  title="Delete your review"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}



        {/* ================= DELETE CONFIRMATION MODAL ================= */}
        <Dialog
          open={Boolean(reviewToDelete)}
          onClose={() => {
            if (!isDeleting) setReviewToDelete(null);
          }}
          className="relative z-[9999]"
        >
          <DialogBackdrop className="fixed inset-0 bg-[#172B2A]/60 backdrop-blur-xs transition-opacity duration-200" />

          <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
            <DialogPanel className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 border border-[#E2D9CC] shadow-2xl text-left transform transition-all text-[#172B2A]">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4">
                <AlertCircle className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#172B2A] mb-2">
                Delete Review?
              </h3>
              <p className="text-sm text-[#4A5A58] leading-relaxed mb-6">
                Are you sure you want to delete this review? This action cannot be undone and will recalculate the product rating.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-[#D1DCDA] bg-white text-[#172B2A] font-bold text-sm hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReview}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm transition-all shadow-xs flex items-center justify-center min-w-[100px] cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? <BeatLoader size={6} color="#ffffff" /> : "Delete"}
                </button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>

      </div>
    </section>
  );
}
