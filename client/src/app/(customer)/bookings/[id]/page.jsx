'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import LiveTrackingMap from '@/components/booking/LiveTrackingMap';
import { 
  Clock, 
  MapPin, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  User, 
  Phone, 
  ShieldCheck, 
  ArrowLeft,
  X,
  FileText,
  Navigation,
  Star,
  Truck,
  CreditCard,
  Check,
  AlertTriangle,
  Receipt,
  MessageSquare
} from 'lucide-react';

const LIFECYCLE_STEPS = [
  { key: 'searching', label: 'Matching Engine' },
  { key: 'offered', label: 'Offer Sent' },
  { key: 'assigned', label: 'Technician Confirmed' },
  { key: 'en_route', label: 'En Route' },
  { key: 'arrived', label: 'Arrived On-Site' },
  { key: 'in_progress', label: 'Work In Progress' },
  { key: 'completed', label: 'Job Completed' },
];

export default function BookingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [quote, setQuote] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [technicianCoords, setTechnicianCoords] = useState(null);
  const [liveEta, setLiveEta] = useState(null);

  // Modals & form state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Quote state
  const [rejectQuoteOpen, setRejectQuoteOpen] = useState(false);
  const [quoteRejectReason, setQuoteRejectReason] = useState('');
  const [decidingQuote, setDecidingQuote] = useState(false);

  // Verification & Dispute
  const [verifying, setVerifying] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputing, setDisputing] = useState(false);

  // Payment
  const [paying, setPaying] = useState(false);
  const [simulateFail, setSimulateFail] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Review
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const availableTags = ['Fast Response', 'Professional', 'Clean Work', 'Clear Communication', 'Accurate Diagnosis', 'Great Value'];

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const res = await apiClient(`/bookings/${id}`);
      if (res.success && res.data) {
        setBooking(res.data.booking);
        if (res.data.booking?.eta) {
          setLiveEta(res.data.booking.eta);
        }
        if (res.data.booking?.assignedTechnician?.currentLocation?.coordinates) {
          setTechnicianCoords(res.data.booking.assignedTechnician.currentLocation.coordinates);
        }
      }

      // Fetch quote if available
      try {
        const quoteRes = await apiClient(`/bookings/${id}/quote`);
        if (quoteRes.success && quoteRes.data?.quote) {
          setQuote(quoteRes.data.quote);
        }
      } catch (e) {
        // Ignore
      }

      // Fetch payment if completed
      try {
        const payRes = await apiClient(`/bookings/${id}/payment`);
        if (payRes.success && payRes.data?.payment) {
          setPayment(payRes.data.payment);
        }
      } catch (e) {
        // Ignore
      }
    } catch (err) {
      setError(err.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();

    // Socket.IO real-time ticket room subscription
    const socket = getSocket();
    if (socket) {
      socket.emit('join:ticket', id);

      socket.on('booking:status', (data) => {
        if (data.bookingId === id || data.ticketNumber === booking?.ticketNumber) {
          fetchBooking();
        }
      });

      socket.on('technician:location', (data) => {
        if (data.bookingId === id && data.coordinates) {
          setTechnicianCoords(data.coordinates);
          if (data.eta) setLiveEta(data.eta);
        }
      });

      socket.on('booking:eta', (data) => {
        if (data.bookingId === id && data.eta) {
          setLiveEta(data.eta);
        }
      });

      socket.on('booking:quote', (data) => {
        fetchBooking();
      });

      socket.on('booking:completion_submitted', (data) => {
        fetchBooking();
      });

      socket.on('booking:completed', (data) => {
        fetchBooking();
      });

      socket.on('payment:success', (data) => {
        fetchBooking();
      });
    }

    return () => {
      if (socket) {
        socket.off('booking:status');
        socket.off('technician:location');
        socket.off('booking:eta');
        socket.off('booking:quote');
        socket.off('booking:completion_submitted');
        socket.off('booking:completed');
        socket.off('payment:success');
      }
    };
  }, [id]);

  const handleCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    try {
      setCancelling(true);
      await apiClient(`/bookings/${id}/cancel`, {
        method: 'POST',
        body: { reason: cancelReason },
      });
      setCancelModalOpen(false);
      await fetchBooking();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleQuoteDecision = async (action) => {
    try {
      setDecidingQuote(true);
      await apiClient(`/bookings/${id}/quote`, {
        method: 'PUT',
        body: {
          quoteId: quote?._id,
          action,
          rejectionReason: action === 'rejected' ? quoteRejectReason : '',
        },
      });
      setRejectQuoteOpen(false);
      await fetchBooking();
    } catch (err) {
      alert(err.message || `Failed to ${action} quote`);
    } finally {
      setDecidingQuote(false);
    }
  };

  const handleVerifyCompletion = async () => {
    try {
      setVerifying(true);
      await apiClient(`/bookings/${id}/verify-completion`, {
        method: 'POST',
        body: { action: 'verify' },
      });
      await fetchBooking();
    } catch (err) {
      alert(err.message || 'Failed to verify completion');
    } finally {
      setVerifying(false);
    }
  };

  const handleDispute = async (e) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    try {
      setDisputing(true);
      await apiClient(`/bookings/${id}/verify-completion`, {
        method: 'POST',
        body: { action: 'dispute', disputeReason },
      });
      setDisputeModalOpen(false);
      await fetchBooking();
    } catch (err) {
      alert(err.message || 'Failed to raise dispute');
    } finally {
      setDisputing(false);
    }
  };

  const handlePay = async () => {
    try {
      setPaying(true);
      setPaymentError('');
      const amount = booking.completion?.finalPrice || booking.pricing?.baseAmount || 50;
      const res = await apiClient(`/bookings/${id}/pay`, {
        method: 'POST',
        body: {
          amount,
          currency: 'USD',
          idempotencyKey: `pay_${id}_${Date.now()}`,
          simulateFailure: simulateFail,
        },
      });

      if (res.success) {
        await fetchBooking();
      }
    } catch (err) {
      setPaymentError(err.message || 'Payment capture failed');
    } finally {
      setPaying(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      setSubmittingReview(true);
      await apiClient(`/bookings/${id}/review`, {
        method: 'POST',
        body: {
          rating,
          comment: reviewComment,
          tags: selectedTags,
        },
      });
      setReviewSubmitted(true);
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  if (loading && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Booking Not Found</h2>
          <p className="text-sm text-slate-600">{error || 'Unable to locate the requested booking'}</p>
          <Link
            href="/bookings"
            className="inline-flex items-center text-sm font-semibold text-blue-600 hover:underline"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === booking.status);
  const isEnRouteOrArrived = ['en_route', 'arrived', 'in_progress'].includes(booking.status);
  const canCancel = ['searching', 'offered', 'assigned', 'en_route'].includes(booking.status);
  const isCompleted = booking.status === 'completed';
  const isPaid = payment?.status === 'captured';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link
          href="/bookings"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> All Bookings
        </Link>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
            {booking.ticketNumber || `#${booking._id.slice(-6)}`}
          </span>
          <span
            className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
              booking.priority === 'urgent'
                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {booking.priority} Priority
          </span>
        </div>
      </div>

      {/* Main Grid: Left Map/Tracker, Right Details/Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Map & Progress (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Leaflet Live Tracking Map */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200/80">
            <LiveTrackingMap
              customerCoords={booking.location?.coordinates || [-122.4194, 37.7749]}
              customerAddress={booking.location?.address}
              technicianCoords={technicianCoords}
              technicianName={booking.assignedTechnician?.user?.name}
              eta={liveEta}
              status={booking.status}
            />
          </div>

          {/* Stepper Progress Bar */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Dispatch Lifecycle</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const isPassed = currentStepIdx >= idx && booking.status !== 'cancelled';
                const isCurrent = currentStepIdx === idx && booking.status !== 'cancelled';
                return (
                  <div
                    key={step.key}
                    className={`p-2.5 rounded-2xl border text-center transition ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                        : isPassed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase">{idx + 1}</div>
                    <div className="text-xs font-semibold leading-tight mt-0.5">{step.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Cards & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Pending Quotation Action Card */}
          {quote && quote.status === 'pending' && (
            <div className="p-6 rounded-3xl bg-amber-50/90 border border-amber-300 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-amber-800">
                <Receipt className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-sm">Quotation Awaiting Your Approval</h3>
              </div>
              <p className="text-xs text-amber-700">
                The technician has inspected the site and provided a formal quote before commencing work:
              </p>

              <div className="bg-white rounded-2xl p-4 border border-amber-200 space-y-2 text-xs">
                {quote.lineItems?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                    <span className="text-slate-700 font-medium">
                      {item.description} ({item.qty}x)
                    </span>
                    <span className="font-bold text-slate-900">${item.total?.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-black text-sm text-slate-900 border-t border-slate-200">
                  <span>Total Estimated Quote:</span>
                  <span className="text-amber-600">${quote.total?.toFixed(2)}</span>
                </div>
                {quote.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-1 pt-1 border-t border-slate-100">
                    Notes: {quote.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  disabled={decidingQuote}
                  onClick={() => handleQuoteDecision('approved')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Proceed</span>
                </button>
                <button
                  type="button"
                  disabled={decidingQuote}
                  onClick={() => setRejectQuoteOpen(true)}
                  className="py-2.5 px-4 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition"
                >
                  Decline Quote
                </button>
              </div>
            </div>
          )}

          {/* 2. Completion Verification Card */}
          {booking.completion?.status === 'submitted' && (
            <div className="p-6 rounded-3xl bg-blue-50/90 border border-blue-300 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-blue-900">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-sm">Technician Completed Work</h3>
              </div>
              <p className="text-xs text-blue-700">
                Please review the technician’s work summary and confirm completion to release payment:
              </p>

              <div className="bg-white rounded-2xl p-4 border border-blue-200 space-y-3 text-xs">
                {booking.completion.notes && (
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase">Technician Notes:</span>
                    <p className="text-slate-800 mt-0.5">{booking.completion.notes}</p>
                  </div>
                )}

                {booking.completion.partsUsed?.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase">Parts Used:</span>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-700">
                      {booking.completion.partsUsed.map((p, idx) => (
                        <li key={idx}>
                          {p.name || p.partCode} (Qty: {p.quantity})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 font-black text-sm text-slate-900 border-t border-slate-100">
                  <span>Final Job Total:</span>
                  <span className="text-blue-600">
                    ${booking.completion.finalPrice?.toFixed(2) || booking.pricing?.baseAmount?.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  disabled={verifying}
                  onClick={handleVerifyCompletion}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{verifying ? 'Verifying...' : 'Verify & Accept Work'}</span>
                </button>
                <button
                  type="button"
                  disabled={verifying}
                  onClick={() => setDisputeModalOpen(true)}
                  className="py-2.5 px-4 rounded-xl bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs transition flex items-center space-x-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Dispute</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Disputed Status Banner */}
          {booking.completion?.status === 'disputed' && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-start space-x-3 text-xs text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-black block text-sm">Dispute Under Admin Review</span>
                <p className="mt-1">
                  You raised a dispute regarding this booking. Payment is on hold while an operations dispatcher reviews
                  the evidence.
                </p>
              </div>
            </div>
          )}

          {/* 4. Payment Checkout Card */}
          {isCompleted && !isPaid && (
            <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-sm">Settlement & Payment</h3>
                </div>
                <span className="text-xs bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Payment Pending
                </span>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Service Total:</span>
                  <span className="font-bold text-white">
                    ${(booking.completion?.finalPrice || booking.pricing?.baseAmount || 50).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Platform Fee (included):</span>
                  <span>$1.50</span>
                </div>
                <div className="flex justify-between items-center pt-2 font-black text-base text-white border-t border-slate-700">
                  <span>Amount Due:</span>
                  <span className="text-emerald-400">
                    ${(booking.completion?.finalPrice || booking.pricing?.baseAmount || 50).toFixed(2)}
                  </span>
                </div>
              </div>

              {paymentError && (
                <div className="p-3 rounded-xl bg-red-900/50 border border-red-700 text-red-200 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Simulate Mock Processor:</span>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={simulateFail}
                      onChange={(e) => setSimulateFail(e.target.checked)}
                      className="rounded border-slate-700 text-rose-500 focus:ring-0"
                    />
                    <span className="text-rose-400 font-semibold">Simulate Decline</span>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={paying}
                  onClick={handlePay}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{paying ? 'Processing Mock Gateway...' : 'Pay Now via Mock Gateway'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. Rating & Review Card */}
          {isCompleted && isPaid && !reviewSubmitted && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-slate-900">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-bold text-sm">Rate Your Technician</h3>
              </div>
              <p className="text-xs text-slate-500">
                Your feedback directly influences technician matching priority and quality scores.
              </p>

              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-2">{rating} Stars</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tell us what you liked about the technician’s work..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{submittingReview ? 'Submitting Review...' : 'Submit Rating & Review'}</span>
                </button>
              </form>
            </div>
          )}

          {reviewSubmitted && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Thank you! Your review has been recorded and submitted to the platform.</span>
            </div>
          )}

          {/* 6. Service & Pricing Information Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
              <span>{booking.service?.name || 'On-Demand Service'}</span>
              <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                {booking.category}
              </span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">{booking.description}</p>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center text-slate-600">
                <MapPin className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                <span className="truncate">{booking.location?.address}</span>
              </div>
              <div className="flex items-center text-slate-600">
                <Phone className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                <span>Contact: {booking.contactPhone}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Pricing Model:</span>
                <span className="font-bold text-slate-800 uppercase">{booking.pricing?.type}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-slate-900">
                <span>Final Price:</span>
                <span>
                  {booking.pricing?.quotationRequired && !quote
                    ? 'Quotation Required'
                    : `$${(booking.completion?.finalPrice || booking.pricing?.baseAmount || 0).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Assigned Technician Card */}
            {booking.assignedTechnician ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-black text-base shadow-sm">
                    {booking.assignedTechnician.user?.name?.[0] || 'T'}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                      <span>{booking.assignedTechnician.user?.name}</span>
                      <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <Star className="w-3 h-3 fill-amber-500 mr-0.5" />
                        {booking.assignedTechnician.rating?.toFixed(1) || '5.0'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-2 mt-0.5">
                      {booking.assignedTechnician.vehicleType && (
                        <span className="capitalize flex items-center">
                          <Truck className="w-3 h-3 mr-1 text-slate-400" />
                          {booking.assignedTechnician.vehicleType}
                        </span>
                      )}
                      <span>&bull; Reliability: {booking.assignedTechnician.reliabilityScore || 100}%</span>
                    </div>
                  </div>
                </div>

                {booking.assignedTechnician.user?.phone && (
                  <a
                    href={`tel:${booking.assignedTechnician.user.phone}`}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition flex items-center space-x-1.5 flex-shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call {booking.assignedTechnician.user.phone}</span>
                  </a>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1">
                <span className="font-bold text-slate-700 block">Intelligent Matching Active</span>
                <p>
                  The dispatch engine is querying nearby eligible technicians with in-stock parts and verified credentials.
                </p>
              </div>
            )}

            {/* Cancel button */}
            {canCancel && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition"
                >
                  Cancel Service Request
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decline Quote Modal */}
      {rejectQuoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Decline Quotation</h3>
            <p className="text-xs text-slate-500">
              Please specify why you are declining the quotation. The technician may submit a revised proposal or you
              can cancel with no fee.
            </p>
            <textarea
              rows={3}
              value={quoteRejectReason}
              onChange={(e) => setQuoteRejectReason(e.target.value)}
              placeholder="e.g. Price is higher than expected / will arrange alternative"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setRejectQuoteOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-700"
              >
                Back
              </button>
              <button
                type="button"
                disabled={decidingQuote}
                onClick={() => handleQuoteDecision('rejected')}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                {decidingQuote ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">Raise Service Dispute</h3>
            </div>
            <p className="text-xs text-slate-500">
              Payment will be frozen immediately and sent to an operations dispatcher for resolution.
            </p>
            <form onSubmit={handleDispute} className="space-y-4">
              <textarea
                required
                rows={4}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe what was incomplete, incorrect, or damaged..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disputing || !disputeReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {disputing ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Cancel Service Request?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel this booking? Please provide a cancellation reason.
            </p>

            <form onSubmit={handleCancel} className="space-y-4">
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Issue resolved on my own / schedule conflict"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500"
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-700"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelling || !cancelReason.trim()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
