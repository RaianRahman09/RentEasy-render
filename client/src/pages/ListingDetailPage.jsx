import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ListingLocationMap from '../components/maps/ListingLocationMap';
import { useAuth } from '../context/AuthContext';
import { formatListingAddress } from '../utils/address';
import { formatRentStartMonth } from '../utils/rentStartMonth';

const REVIEW_LOCKED_MESSAGE =
  'You can review this property after your stay is complete and all payments are cleared.';

const formatRent = (value) => `৳${Number(value || 0).toLocaleString('en-BD')}`;
const stars = [1, 2, 3, 4, 5];

const formatReviewDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const ListingDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingRent, setStartingRent] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [ratingSummary, setRatingSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    recommendCount: 0,
    recommendRate: null,
  });
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState({
    loading: false,
    canReview: false,
    message: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    reviewText: '',
    wouldRecommend: null,
  });

  const isTenant = user?.role === 'tenant';

  const loadPublicReviewData = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const [summaryRes, reviewsRes] = await Promise.all([
        api.get(`/listings/${id}/rating-summary`),
        api.get(`/listings/${id}/reviews`, { params: { limit: 8 } }),
      ]);
      setRatingSummary({
        averageRating: Number(summaryRes.data?.averageRating || 0),
        totalReviews: Number(summaryRes.data?.totalReviews || 0),
        recommendCount: Number(summaryRes.data?.recommendCount || 0),
        recommendRate: summaryRes.data?.recommendRate ?? null,
      });
      setReviews(reviewsRes.data?.reviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  const loadReviewEligibility = useCallback(async () => {
    if (!isTenant) {
      setReviewEligibility({ loading: false, canReview: false, message: '' });
      return;
    }

    setReviewEligibility((prev) => ({ ...prev, loading: true }));
    try {
      const res = await api.get(`/listings/${id}/review-eligibility`);
      setReviewEligibility({
        loading: false,
        canReview: Boolean(res.data?.canReview),
        message: res.data?.message || REVIEW_LOCKED_MESSAGE,
      });
    } catch (err) {
      setReviewEligibility({
        loading: false,
        canReview: false,
        message: err.response?.data?.message || REVIEW_LOCKED_MESSAGE,
      });
    }
  }, [id, isTenant]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/listings/${id}`);
        setListing(res.data.listing);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load listing.');
        setListing(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    loadPublicReviewData();
  }, [loadPublicReviewData]);

  useEffect(() => {
    loadReviewEligibility();
  }, [loadReviewEligibility]);

  const listingImages = useMemo(() => {
    if (!listing) return [];
    if (Array.isArray(listing.images) && listing.images.length) return listing.images;
    if (Array.isArray(listing.imageUrls) && listing.imageUrls.length) return listing.imageUrls;
    if (Array.isArray(listing.photos) && listing.photos.length) return listing.photos;
    return [];
  }, [listing]);

  useEffect(() => {
    setActiveImageIndex((prev) => {
      if (!listingImages.length) return 0;
      return prev >= listingImages.length ? 0 : prev;
    });
  }, [listingImages]);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!reviewEligibility.canReview) {
      toast.error(REVIEW_LOCKED_MESSAGE);
      return;
    }
    if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) {
      toast.error('Please select a star rating from 1 to 5.');
      return;
    }

    setSubmittingReview(true);
    try {
      await api.post(`/listings/${id}/reviews`, {
        rating: reviewForm.rating,
        reviewText: reviewForm.reviewText.trim(),
        wouldRecommend: reviewForm.wouldRecommend,
      });
      toast.success('Thanks for sharing your review.');
      setReviewForm({ rating: 0, reviewText: '', wouldRecommend: null });
      await Promise.all([loadPublicReviewData(), loadReviewEligibility()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Loading listing...
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Listing not found.
        </div>
      </div>
    );
  }

  const coordinates = listing.location?.coordinates;
  const hasCoordinates =
    Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every((value) => Number.isFinite(value));
  const placeholderImage =
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80';
  const primaryImage = listingImages[activeImageIndex] || placeholderImage;
  const roundedAverage = Math.round(Number(ratingSummary.averageRating || 0));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="h-80 w-full overflow-hidden rounded-xl bg-slate-200">
              <img src={primaryImage} alt={listing.title} className="h-full w-full object-cover" />
            </div>
            {listingImages.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {listingImages.map((image, index) => {
                  const isActive = index === activeImageIndex;
                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border transition ${
                        isActive ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
                      }`}
                      aria-current={isActive}
                    >
                      <img
                        src={image}
                        alt={`${listing.title} thumbnail ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{listing.title}</h1>
              <div className="text-slate-600">{formatListingAddress(listing)}</div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                {Number(ratingSummary.totalReviews || 0) > 0 ? (
                  <>
                    <div className="flex items-center gap-0.5">
                      {stars.map((star) => (
                        <span
                          key={`summary-star-${star}`}
                          className={star <= roundedAverage ? 'text-amber-500' : 'text-slate-300'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="font-semibold text-slate-700">
                      {Number(ratingSummary.averageRating || 0).toFixed(1)}
                    </span>
                    <span className="text-slate-500">({ratingSummary.totalReviews} reviews)</span>
                  </>
                ) : (
                  <span className="text-slate-500">No reviews yet</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-700">{formatRent(listing.rent)}/mo</div>
              <div className="text-sm text-slate-500">{listing.roomType}</div>
              {listing.rentStartMonth && (
                <div className="text-sm text-slate-500">
                  Available from: {formatRentStartMonth(listing.rentStartMonth)}
                </div>
              )}
            </div>
          </div>

          <div className="text-sm text-slate-700">{listing.description}</div>

          <div className="flex flex-wrap gap-2 text-sm text-slate-700">
            <span className="rounded-full bg-slate-100 px-3 py-1">{listing.beds} Beds</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{listing.baths} Baths</span>
            {listing.amenities?.map((a) => (
              <span key={a} className="rounded-full bg-slate-100 px-3 py-1">
                {a}
              </span>
            ))}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Ratings & Reviews</h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average Rating</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {Number(ratingSummary.totalReviews || 0) > 0
                    ? Number(ratingSummary.averageRating || 0).toFixed(1)
                    : '-'}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Reviews</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{ratingSummary.totalReviews || 0}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Would Recommend</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">
                  {ratingSummary.recommendRate === null ? '-' : `${ratingSummary.recommendRate}%`}
                </div>
              </div>
            </div>

            {isTenant && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Leave a Review</h3>
                {reviewEligibility.loading ? (
                  <div className="mt-2 text-sm text-slate-500">Checking review eligibility...</div>
                ) : reviewEligibility.canReview ? (
                  <form className="mt-3 space-y-3" onSubmit={submitReview}>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Star Rating</div>
                      <div className="mt-1 flex items-center gap-1">
                        {stars.map((star) => (
                          <button
                            key={`input-star-${star}`}
                            type="button"
                            onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                            className={`text-2xl ${
                              star <= reviewForm.rating ? 'text-amber-500' : 'text-slate-300'
                            }`}
                            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reviewText" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Written Review (Optional)
                      </label>
                      <textarea
                        id="reviewText"
                        value={reviewForm.reviewText}
                        onChange={(event) =>
                          setReviewForm((prev) => ({ ...prev, reviewText: event.target.value }))
                        }
                        rows={4}
                        maxLength={2000}
                        placeholder="Share your experience with this property (optional)."
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Would Recommend (Optional)
                      </div>
                      <div className="mt-1 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewForm((prev) => ({ ...prev, wouldRecommend: true }))}
                          className={`rounded-lg border px-3 py-1 text-sm ${
                            reviewForm.wouldRecommend === true
                              ? 'border-green-600 bg-green-50 text-green-700'
                              : 'border-slate-300 text-slate-600'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewForm((prev) => ({ ...prev, wouldRecommend: false }))}
                          className={`rounded-lg border px-3 py-1 text-sm ${
                            reviewForm.wouldRecommend === false
                              ? 'border-rose-600 bg-rose-50 text-rose-700'
                              : 'border-slate-300 text-slate-600'
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewForm((prev) => ({ ...prev, wouldRecommend: null }))}
                          className={`rounded-lg border px-3 py-1 text-sm ${
                            reviewForm.wouldRecommend === null
                              ? 'border-slate-500 bg-slate-100 text-slate-700'
                              : 'border-slate-300 text-slate-600'
                          }`}
                        >
                          Skip
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                ) : (
                  <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
                    {reviewEligibility.message || REVIEW_LOCKED_MESSAGE}
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-slate-900">Recent Reviews</h3>
              {reviewsLoading ? (
                <div className="mt-2 text-sm text-slate-500">Loading reviews...</div>
              ) : reviews.length ? (
                <div className="mt-3 space-y-3">
                  {reviews.map((review) => (
                    <article key={review._id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{review.reviewer?.name || 'Tenant'}</div>
                          <div className="text-xs text-slate-500">{formatReviewDate(review.createdAt)}</div>
                        </div>
                        <div className="text-sm font-semibold text-amber-600">{'★'.repeat(review.rating)}</div>
                      </div>
                      {review.reviewText ? (
                        <p className="mt-2 text-sm text-slate-700">{review.reviewText}</p>
                      ) : (
                        <p className="mt-2 text-sm italic text-slate-500">No written review provided.</p>
                      )}
                      {typeof review.wouldRecommend === 'boolean' && (
                        <div
                          className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            review.wouldRecommend
                              ? 'bg-green-100 text-green-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {review.wouldRecommend ? 'Would recommend' : 'Would not recommend'}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                  No reviews yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-700">Landlord Info</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">{listing.owner?.name || 'Landlord'}</div>
            {listing.owner?.verificationStatus === 'verified' && (
              <div className="text-xs font-semibold text-green-700">Verified</div>
            )}
            <div className="mt-3 flex gap-2">
              {isTenant && (
                <button
                  type="button"
                  onClick={async () => {
                    setStartingChat(true);
                    try {
                      const res = await api.post('/chat/conversations', { listingId: listing._id });
                      navigate(`/chat/${res.data.conversationId}`);
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to start conversation.');
                    } finally {
                      setStartingChat(false);
                    }
                  }}
                  disabled={startingChat}
                  className="flex-1 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {startingChat ? 'Starting...' : 'Message Landlord'}
                </button>
              )}
              {isTenant ? (
                <Link
                  to={`/appointments/new/${listing._id}`}
                  className="flex-1 rounded-lg border border-blue-700 px-3 py-2 text-center text-sm font-semibold text-blue-700"
                >
                  Request Viewing
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex-1 cursor-not-allowed rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-400"
                >
                  Request Viewing
                </button>
              )}
            </div>
            {isTenant && (
              <button
                type="button"
                onClick={async () => {
                  setStartingRent(true);
                  try {
                    const res = await api.post(`/rentals/${listing._id}/start`);
                    navigate(`/bookings/${res.data.rentalId}/pay`);
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to start rental.');
                  } finally {
                    setStartingRent(false);
                  }
                }}
                disabled={startingRent}
                className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {startingRent ? 'Starting...' : 'Rent this property'}
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-700">Location</div>
            <div className="mt-2">
              {hasCoordinates ? (
                <ListingLocationMap coordinates={coordinates} title={listing.title} />
              ) : (
                <div className="flex h-60 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
                  Location not available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailPage;
