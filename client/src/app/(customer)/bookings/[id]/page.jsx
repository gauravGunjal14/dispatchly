'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatMoney, formatDate, getPlatformCurrency } from '@/lib/format';
import { DEFAULT_MAP_CENTER } from '@/lib/config';
import dynamic from 'next/dynamic';
const BrandMap = dynamic(() => import('@/components/map/BrandMap'), { ssr: false });
import { Button, StatusPill, Panel } from '@/components/ui';
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
  Star,
  Truck,
  CreditCard,
  Check,
  AlertTriangle,
  Receipt,
  MessageSquare
} from 'lucide-react';

const LIFECYCLE_STEPS = [
  { key: 'searching', label: 'Matching' },
  { key: 'offered', label: 'Offer sent' },
  { key: 'assigned', label: 'Confirmed' },
  { key: 'en_route', label: 'En route' },
  { key: 'arrived', label: 'Arrived on-site' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
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
  const [routeData, setRouteData] = useState(null);

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
  const [paymentError, setPaymentError] = useState('');

  // Review
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const availableTags = ['Fast response', 'Professional', 'Clean work', 'Clear communication', 'Accurate diagnosis', 'Great value'];

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient(`/bookings/${id}`);
      if (res.success && res.data) {
        setBooking(res.data.booking);
        if (res.data.booking?.eta) {
          setLiveEta(res.data.booking.eta);
        }
        if (res.data.booking?.assignedTechnician?.currentLocation?.coordinates) {
          setTechnicianCoords(res.data.booking.assignedTechnician.currentLocation.coordinates);
          try {
            const routeRes = await apiClient(`/bookings/${id}/route`);
            if (routeRes.success && routeRes.data) {
              setRouteData(routeRes.data);
            }
          } catch {
            // Non-blocking route fetch
          }
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

      socket.on('booking:quote', () => {
        fetchBooking();
      });

      socket.on('booking:completion_submitted', () => {
        fetchBooking();
      });

      socket.on('booking:completed', () => {
        fetchBooking();
      });

      socket.on('payment:success', () => {
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
        body: JSON.stringify({ reason: cancelReason }),
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
        body: JSON.stringify({
          quoteId: quote?._id,
          action,
          rejectionReason: action === 'rejected' ? quoteRejectReason : '',
        }),
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
        body: JSON.stringify({ action: 'verify' }),
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
        body: JSON.stringify({ action: 'dispute', disputeReason }),
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
        body: JSON.stringify({
          amount,
          currency: booking.pricing?.currency || getPlatformCurrency(),
          idempotencyKey: `pay_${id}_${Date.now()}`,
          simulateFailure: false,
        }),
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
        body: JSON.stringify({
          rating,
          comment: reviewComment,
          tags: selectedTags,
        }),
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

  // Loading State
  if (loading && !booking) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-3">
        <div className="text-sm font-semibold text-ink">
          Loading booking details...
        </div>
        <p className="text-xs text-ink/60">Connecting to dispatch live feed</p>
      </div>
    );
  }

  // Error / Not Found State
  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="p-8 bg-white border border-line rounded-panel text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-status-danger mx-auto" />
          <h2 className="font-headline font-bold text-lg text-ink">
            Booking not found
          </h2>
          <p className="text-sm text-ink/70">
            {error || 'Unable to locate the requested booking. It may have expired or been removed.'}
          </p>
          <div className="pt-2">
            <Link href="/bookings">
              <Button variant="outline" size="sm" leftIcon={ArrowLeft}>
                Back to my bookings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStepIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === booking.status);
  const canCancel = ['searching', 'offered', 'assigned', 'en_route'].includes(booking.status);
  const isCompleted = booking.status === 'completed';
  const isPaid = payment?.status === 'captured';

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 text-ink">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-line">
        <div className="space-y-1">
          <Link
            href="/bookings"
            className="inline-flex items-center text-xs font-semibold text-ink/70 hover:text-ink transition mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to all bookings
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-ink">
              {booking.ticketNumber || `#${booking._id.slice(-6)}`}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-control bg-concrete text-ink font-semibold border border-line capitalize">
              {booking.priority} priority
            </span>
            <StatusPill status={booking.status} />
          </div>
        </div>

        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCancelModalOpen(true)}
          >
            Cancel request
          </Button>
        )}
      </div>

      {/* 1. Status Timeline Block */}
      <div className="bg-white rounded-panel border border-line p-5 sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-line pb-3">
          <span className="text-xs font-bold text-ink">
            Dispatch status timeline
          </span>
          <span className="text-xs text-ink/60">
            Updated live via socket
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isPassed = currentStepIdx >= idx && booking.status !== 'cancelled';
            const isCurrent = currentStepIdx === idx && booking.status !== 'cancelled';

            return (
              <div
                key={step.key}
                className={`p-3 rounded-control border text-left transition ${
                  isCurrent
                    ? 'bg-ink text-white border-ink'
                    : isPassed
                    ? 'bg-concrete text-ink border-line'
                    : 'bg-white text-ink/40 border-line'
                }`}
              >
                <div className="text-[10px] font-mono font-bold">
                  {isPassed && !isCurrent ? 'Done' : `0${idx + 1}`}
                </div>
                <div className="text-xs font-semibold mt-0.5 leading-snug">
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Live Map & Location (7 cols) */}
        <div className="lg:col-span-7 space-y-6 min-w-0">
          
          {/* 2. Expected Arrival / ETA Block & Live Tracking Map */}
          <div className="bg-white rounded-panel border border-line overflow-hidden space-y-0">
            <div className="p-4 bg-concrete/60 border-b border-line flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <Clock className="w-4 h-4 text-ink" />
                <span>
                  {liveEta ? `Expected arrival: about ${liveEta} minutes` : 'Arrival deadline: within about 2 hours'}
                </span>
              </div>
              <span className="text-xs text-ink/60">
                Live GPS position
              </span>
            </div>

            {/* Framed Map */}
            <BrandMap
              mode="tracking"
              customerCoords={booking.location?.coordinates || DEFAULT_MAP_CENTER.coordinates}
              technicianCoords={technicianCoords}
              technicianName={booking.assignedTechnician?.name || booking.assignedTechnician?.user?.name}
              category={booking.category || booking.service?.category || 'plumbing'}
              eta={liveEta}
              distanceKm={routeData ? routeData.distanceMeters / 1000 : undefined}
              routeGeometry={routeData?.geometry}
              heightClass="h-[360px]"
            />
          </div>

          {/* Service & Destination Details */}
          <div className="bg-white rounded-panel border border-line p-5 sm:p-6 space-y-4">
            <div className="border-b border-line pb-3">
              <h3 className="font-headline font-bold text-base text-ink">
                Service request details
              </h3>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-ink/80">
              <div>
                <span className="font-semibold text-ink/60 block text-xs">Service</span>
                <div className="font-bold text-ink mt-0.5">{booking.service?.name || 'On-demand service'}</div>
                <p className="text-ink/70 mt-1 leading-relaxed">{booking.description}</p>
              </div>

              <div className="pt-2 border-t border-line/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="font-semibold text-ink/60 block text-xs">Destination address</span>
                  <div className="flex items-start gap-1.5 mt-0.5">
                    <MapPin className="w-4 h-4 text-ink/50 flex-shrink-0 mt-0.5" />
                    <span>{booking.location?.address}</span>
                  </div>
                  {booking.location?.landmark && (
                    <div className="text-xs text-ink/60 mt-0.5 pl-5">
                      Note: {booking.location.landmark}
                    </div>
                  )}
                </div>

                <div>
                  <span className="font-semibold text-ink/60 block text-xs">Contact phone</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-4 h-4 text-ink/50 flex-shrink-0" />
                    <span>{booking.contactPhone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Action Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-6 min-w-0">
          
          {/* 3. Technician Card */}
          {booking.assignedTechnician ? (
            <div className="bg-white rounded-panel border border-line p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="text-xs font-bold text-ink">
                  Assigned technician
                </span>
                <span className="text-xs px-2 py-0.5 rounded-control bg-status-success-tint text-status-success-text font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
                  Verified
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-control bg-amber text-ink flex items-center justify-center font-headline font-bold text-sm flex-shrink-0">
                  {booking.assignedTechnician.name?.[0] || booking.assignedTechnician.user?.name?.[0] || 'T'}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-ink truncate">
                    {booking.assignedTechnician.name || booking.assignedTechnician.user?.name}
                  </div>
                  <div className="text-xs text-ink/60 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-amber font-semibold">
                      <Star className="w-3 h-3 fill-amber" />
                      <span>{booking.assignedTechnician.rating?.toFixed(1) || '4.9'}</span>
                    </span>
                    <span>&bull;</span>
                    <span>Reliability: {booking.assignedTechnician.reliabilityScore || 98}%</span>
                  </div>
                </div>
              </div>

              {(booking.assignedTechnician.phone || booking.assignedTechnician.user?.phone) && (
                <div className="pt-2 border-t border-line/60">
                  <a
                    href={`tel:${booking.assignedTechnician.phone || booking.assignedTechnician.user?.phone}`}
                    className="inline-flex items-center justify-center w-full py-2 px-3 rounded-control border border-line text-xs font-semibold text-ink hover:bg-concrete transition gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call technician</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-panel border border-line p-5 space-y-2">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-xs font-bold text-ink">
                  Technician matching in progress
                </span>
                <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
              </div>
              <p className="text-xs text-ink/70 leading-relaxed">
                We are matching qualified technicians based on skills, van parts, and your arrival deadline.
              </p>
            </div>
          )}

          {/* 4. Quote Approval Block (when quote is pending) */}
          {quote && quote.status === 'pending' && (
            <div className="bg-white rounded-panel border border-line p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-ink" />
                  <span className="text-xs font-bold text-ink">
                    Quotation awaiting your approval
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-control bg-status-warning-tint text-ink font-semibold">
                  Action required
                </span>
              </div>

              <p className="text-xs text-ink/70">
                The technician has inspected the work site and provided an itemised quotation:
              </p>

              <div className="p-3.5 rounded-control bg-concrete/50 border border-line space-y-2 text-xs">
                {quote.lineItems?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-line/60 last:border-0">
                    <span className="text-ink">
                      {item.description} ({item.qty}x)
                    </span>
                    <span className="font-semibold text-ink tabular-nums">
                      {formatMoney(item.total || 0)}
                    </span>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-2 font-bold text-sm text-ink border-t border-line">
                  <span>Total quote:</span>
                  <span className="text-ink tabular-nums">{formatMoney(quote.total || 0)}</span>
                </div>

                {quote.notes && (
                  <p className="text-[11px] text-ink/60 pt-1 border-t border-line/40">
                    Notes: {quote.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={decidingQuote}
                  onClick={() => handleQuoteDecision('approved')}
                  leftIcon={Check}
                >
                  Approve and proceed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={decidingQuote}
                  onClick={() => setRejectQuoteOpen(true)}
                >
                  Decline quote
                </Button>
              </div>
            </div>
          )}

          {/* 5. Completion Verification & Proof of Work Block */}
          {booking.completion?.status === 'submitted' && (
            <div className="bg-white rounded-panel border border-line p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-status-success" />
                  <span className="text-xs font-bold text-ink">
                    Work completed by technician
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-control bg-status-success-tint text-status-success-text font-semibold">
                  Awaiting review
                </span>
              </div>

              <p className="text-xs text-ink/70">
                Please verify the technician's notes and parts used to complete the job:
              </p>

              <div className="p-3.5 rounded-control bg-concrete/50 border border-line space-y-2 text-xs">
                {booking.completion.notes && (
                  <div>
                    <span className="font-semibold text-ink/60 block text-[11px]">Technician notes:</span>
                    <p className="text-ink mt-0.5">{booking.completion.notes}</p>
                  </div>
                )}

                {booking.completion.partsUsed?.length > 0 && (
                  <div className="pt-2 border-t border-line/60">
                    <span className="font-semibold text-ink/60 block text-[11px]">Parts used from van:</span>
                    <ul className="list-disc list-inside mt-0.5 text-ink space-y-0.5">
                      {booking.completion.partsUsed.map((p, idx) => (
                        <li key={idx}>
                          {p.name || p.partCode} (Qty: {p.quantity})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 font-bold text-sm text-ink border-t border-line">
                  <span>Final job amount:</span>
                  <span className="text-ink tabular-nums">
                    {formatMoney(booking.completion.finalPrice || booking.pricing?.baseAmount || 0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={verifying}
                  onClick={handleVerifyCompletion}
                  leftIcon={Check}
                >
                  {verifying ? 'Verifying...' : 'Verify and accept work'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={verifying}
                  onClick={() => setDisputeModalOpen(true)}
                >
                  Raise dispute
                </Button>
              </div>
            </div>
          )}

          {/* Disputed Notice Banner */}
          {booking.completion?.status === 'disputed' && (
            <div className="p-4 rounded-control bg-status-danger-tint border border-status-danger/30 text-xs text-status-danger-text space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-status-danger" />
                <span>Dispute under operations review</span>
              </div>
              <p className="text-xs text-status-danger-text/90">
                You raised a dispute on this booking. Payment settlement is on hold while an operations dispatcher reviews the case.
              </p>
            </div>
          )}

          {/* 6. Payment Checkout Block */}
          {isCompleted && !isPaid && (
            <div className="bg-white rounded-panel border border-line p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-ink" />
                  <span className="text-xs font-bold text-ink">
                    Payment settlement
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-control bg-status-warning-tint text-ink font-semibold">
                  Payment pending
                </span>
              </div>

              {/* Test Mode Banner */}
              <div className="p-3 rounded-control bg-concrete border border-line text-xs space-y-0.5 text-ink/80">
                <div className="font-semibold text-ink">Test mode active</div>
                <div>No real money is charged. Test settlement confirms completion.</div>
              </div>

              <div className="p-3.5 rounded-control bg-concrete/50 border border-line space-y-2 text-xs">
                <div className="flex justify-between items-center text-ink/70">
                  <span>Service amount:</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {formatMoney(booking.completion?.finalPrice || booking.pricing?.baseAmount || 50)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-ink/60 text-[11px]">
                  <span>Platform fee:</span>
                  <span>Included in total</span>
                </div>
                <div className="flex justify-between items-center pt-2 font-bold text-sm text-ink border-t border-line">
                  <span>Amount due:</span>
                  <span className="text-ink tabular-nums">
                    {formatMoney(booking.completion?.finalPrice || booking.pricing?.baseAmount || 50)}
                  </span>
                </div>
              </div>

              {paymentError && (
                <div className="p-3 rounded-control bg-status-danger-tint border border-status-danger/30 text-status-danger-text text-xs">
                  {paymentError}
                </div>
              )}

              <Button
                variant="primary"
                size="md"
                fullWidth
                disabled={paying}
                onClick={handlePay}
                leftIcon={CreditCard}
              >
                {paying ? 'Processing payment...' : 'Pay now (test mode)'}
              </Button>
            </div>
          )}

          {/* 7. Rating & Review Block */}
          {isCompleted && isPaid && !reviewSubmitted && (
            <div className="bg-white rounded-panel border border-line p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber fill-amber" />
                  <span className="text-xs font-bold text-ink">
                    Rate your technician
                  </span>
                </div>
              </div>

              <p className="text-xs text-ink/70">
                Your feedback influences technician matching score and dispatch reliability.
              </p>

              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 transition hover:opacity-80"
                      aria-label={`${star} stars`}
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? 'text-amber fill-amber'
                            : 'text-line'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-ink ml-2">{rating} stars</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-2.5 py-1 rounded-control border transition ${
                          isSelected
                            ? 'bg-ink text-white border-ink'
                            : 'bg-white text-ink/70 border-line hover:text-ink hover:bg-concrete'
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
                  placeholder="Leave a brief review for the technician..."
                  className="w-full px-3 py-2 text-xs rounded-control border border-line bg-white text-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  fullWidth
                  disabled={submittingReview}
                  leftIcon={MessageSquare}
                >
                  {submittingReview ? 'Submitting review...' : 'Submit review'}
                </Button>
              </form>
            </div>
          )}

          {reviewSubmitted && (
            <div className="p-4 rounded-control bg-status-success-tint border border-status-success/30 text-status-success-text text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-status-success flex-shrink-0" />
              <span>Thank you! Your rating and review have been submitted.</span>
            </div>
          )}

          {/* Pricing Overview Box */}
          <div className="bg-white rounded-panel border border-line p-5 space-y-3">
            <div className="border-b border-line pb-2.5 flex justify-between items-center text-xs">
              <span className="font-bold text-ink">Pricing summary</span>
              <span className="font-semibold text-ink/60 capitalize">{booking.pricing?.type || 'Standard'}</span>
            </div>

            <div className="flex justify-between items-center text-sm font-bold text-ink">
              <span>Total amount:</span>
              <span className="tabular-nums">
                {formatMoney(booking.completion?.finalPrice || booking.pricing?.baseAmount || booking.pricing?.estimatedAmount || 0)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Decline Quote Modal */}
      {rejectQuoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 shadow-floating border border-line space-y-4">
            <h3 className="font-headline font-bold text-base text-ink">
              Decline quotation
            </h3>
            <p className="text-xs text-ink/70">
              Please specify why you are declining the quotation. The technician may submit a revised proposal or you can cancel with no fee.
            </p>
            <textarea
              rows={3}
              value={quoteRejectReason}
              onChange={(e) => setQuoteRejectReason(e.target.value)}
              placeholder="e.g. Price is higher than expected"
              className="w-full px-3 py-2 text-xs rounded-control border border-line focus:outline-none focus:ring-2 focus:ring-ink"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectQuoteOpen(false)}
              >
                Back
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={decidingQuote}
                onClick={() => handleQuoteDecision('rejected')}
              >
                {decidingQuote ? 'Declining...' : 'Confirm decline'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 shadow-floating border border-line space-y-4">
            <div className="flex items-center gap-2 text-status-danger">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-headline font-bold text-base text-ink">
                Raise service dispute
              </h3>
            </div>
            <p className="text-xs text-ink/70">
              Payment will be frozen immediately and sent to an operations dispatcher for review.
            </p>
            <form onSubmit={handleDispute} className="space-y-4">
              <textarea
                required
                rows={4}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe what was incomplete, incorrect, or damaged..."
                className="w-full px-3 py-2 text-xs rounded-control border border-line focus:outline-none focus:ring-2 focus:ring-ink"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDisputeModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={disputing || !disputeReason.trim()}
                >
                  {disputing ? 'Submitting...' : 'Submit dispute'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 shadow-floating border border-line space-y-4">
            <h3 className="font-headline font-bold text-base text-ink">
              Cancel service request?
            </h3>
            <p className="text-xs text-ink/70">
              Are you sure you want to cancel this booking? Please provide a cancellation reason.
            </p>

            <form onSubmit={handleCancel} className="space-y-4">
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Issue resolved on my own / schedule conflict"
                className="w-full px-3 py-2 text-xs rounded-control border border-line focus:outline-none focus:ring-2 focus:ring-ink"
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelModalOpen(false)}
                >
                  Keep booking
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  disabled={cancelling || !cancelReason.trim()}
                >
                  {cancelling ? 'Cancelling...' : 'Confirm cancellation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
