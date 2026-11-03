'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  Wrench,
  Package,
  Radio,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Phone,
  Navigation,
  Check,
  X,
  RotateCcw,
  Zap,
  Receipt,
  DollarSign,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';

export default function TechnicianDashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ inventoryCount: 0, activeJobCount: 0, rating: 5.0, reliabilityScore: 100 });
  const [offers, setOffers] = useState([]);
  const [currentJob, setCurrentJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rejectModalOffer, setRejectModalOffer] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelModalJob, setCancelModalJob] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [gpsPinging, setGpsPinging] = useState(false);
  const [gpsSuccess, setGpsSuccess] = useState(false);

  // Phase 6: Quote & Completion Modals
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteLineItems, setQuoteLineItems] = useState([{ description: '', qty: 1, unitPrice: 0 }]);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeFinalPrice, setCompleteFinalPrice] = useState('');
  const [completeParts, setCompleteParts] = useState([]);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [submittingComplete, setSubmittingComplete] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [profileRes, offersRes, jobRes] = await Promise.all([
        apiClient('/technicians/me/profile'),
        apiClient('/dispatch/offers'),
        apiClient('/technicians/jobs/current'),
      ]);

      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data.profile);
        if (profileRes.data.stats) setStats(profileRes.data.stats);
      }
      if (offersRes.success && offersRes.data) {
        setOffers(offersRes.data.offers || []);
      }
      if (jobRes.success && jobRes.data) {
        setCurrentJob(jobRes.data.job || null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load technician data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Setup Socket.IO real-time listener for incoming offers & status changes
    const socket = getSocket();
    if (socket) {
      if (user?._id) {
        socket.emit('join:user', user._id);
      }

      socket.on('offer:new', (newOffer) => {
        setOffers((prev) => [newOffer, ...prev.filter((o) => o._id !== newOffer.offerId)]);
      });

      socket.on('offer:expired', ({ offerId }) => {
        setOffers((prev) => prev.filter((o) => o._id !== offerId));
      });

      socket.on('offer:accepted', () => {
        fetchAllData();
      });

      socket.on('job:assigned', () => {
        fetchAllData();
      });

      socket.on('technician:status', (payload) => {
        setProfile((prev) => (prev ? { ...prev, ...payload } : prev));
      });
    }

    return () => {
      if (socket) {
        socket.off('offer:new');
        socket.off('offer:expired');
        socket.off('offer:accepted');
        socket.off('job:assigned');
        socket.off('technician:status');
      }
    };
  }, [user]);

  // Periodic countdown ticker for active offers
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    setErrorMsg('');

    if (profile.verificationStatus !== 'approved') {
      setErrorMsg('You cannot go online until your profile and credentials are approved by a dispatcher.');
      return;
    }

    setToggling(true);
    try {
      const res = await apiClient('/technicians/me/availability', {
        method: 'PUT',
        body: JSON.stringify({ isAvailable: !profile.isAvailable }),
      });
      if (res.success) {
        setProfile((prev) => ({ ...prev, isAvailable: res.data.isAvailable }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to toggle availability');
    } finally {
      setToggling(false);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient(`/dispatch/offers/${offerId}/accept`, {
        method: 'POST',
      });
      if (res.success) {
        setOffers((prev) => prev.filter((o) => o._id !== offerId));
        fetchAllData();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to accept offer. It may have expired or been reassigned.');
      fetchAllData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOffer = async () => {
    if (!rejectModalOffer) return;
    setActionLoading(true);
    try {
      await apiClient(`/dispatch/offers/${rejectModalOffer._id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason || 'Declined by technician' }),
      });
      setOffers((prev) => prev.filter((o) => o._id !== rejectModalOffer._id));
      setRejectModalOffer(null);
      setRejectReason('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reject offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateJobStatus = async (targetStatus) => {
    if (!currentJob) return;
    setActionLoading(true);
    try {
      await apiClient(`/technicians/jobs/${currentJob._id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: targetStatus }),
      });
      fetchAllData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update job status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!cancelModalJob) return;
    setActionLoading(true);
    try {
      const res = await apiClient(`/technicians/jobs/${cancelModalJob._id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason || 'Technician requested release' }),
      });
      alert(res.message || 'Job status updated');
      setCancelModalJob(null);
      setCancelReason('');
      fetchAllData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to cancel job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    if (!currentJob) return;
    setSubmittingQuote(true);
    try {
      await apiClient(`/technicians/jobs/${currentJob._id}/quote`, {
        method: 'POST',
        body: { lineItems: quoteLineItems, notes: quoteNotes },
      });
      alert('Quotation submitted successfully to customer!');
      setQuoteModalOpen(false);
      fetchAllData();
    } catch (err) {
      alert(err.message || 'Failed to submit quotation');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    if (!currentJob) return;
    setSubmittingComplete(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('dispatchly_access_token') : '';
      const formData = new FormData();
      formData.append('notes', completeNotes);
      if (completeFinalPrice) formData.append('finalPrice', completeFinalPrice);
      formData.append('partsUsed', JSON.stringify(completeParts));
      for (const file of evidenceFiles) {
        formData.append('evidence', file);
      }

      const res = await fetch(`http://localhost:5000/api/technicians/jobs/${currentJob._id}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to submit completion');

      alert('Completion proof submitted! Awaiting customer verification.');
      setCompleteModalOpen(false);
      fetchAllData();
    } catch (err) {
      alert(err.message || 'Failed to submit completion');
    } finally {
      setSubmittingComplete(false);
    }
  };

  const handlePingGps = async () => {
    setGpsPinging(true);
    setGpsSuccess(false);
    try {
      // Simulate slight realistic movement around San Francisco
      const current = profile?.currentLocation?.coordinates || [-122.4194, 37.7749];
      const jitterLng = current[0] + (Math.random() - 0.5) * 0.002;
      const jitterLat = current[1] + (Math.random() - 0.5) * 0.002;

      const res = await apiClient('/technicians/location', {
        method: 'PATCH',
        body: JSON.stringify({
          latitude: jitterLat,
          longitude: jitterLng,
        }),
      });

      if (res.success) {
        setGpsSuccess(true);
        setProfile((prev) => ({ ...prev, currentLocation: res.data.currentLocation }));
        setTimeout(() => setGpsSuccess(false), 3000);
      }
    } catch (err) {
      console.error('GPS update failed:', err);
    } finally {
      setGpsPinging(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading technician command center...</div>;
  }

  const isApproved = profile?.verificationStatus === 'approved';
  const isPending = profile?.verificationStatus === 'pending';
  const isRejected = profile?.verificationStatus === 'rejected';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Status Toggle */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-slate-900">Technician Command Center</h1>
            {isApproved && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Verified Partner
              </span>
            )}
            {isPending && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                Pending Verification
              </span>
            )}
            {isRejected && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                Verification Rejected
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-800">{user?.name}</span> ({user?.email}) &bull;{' '}
            <span className="capitalize">{profile?.serviceCategories?.join(', ')}</span>
          </p>
        </div>

        {/* Action Controls: GPS Ping & Online Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePingGps}
            disabled={gpsPinging}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border ${
              gpsSuccess
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Update GPS coordinates to prevent stale location exclusion"
          >
            <Radio className={`w-3.5 h-3.5 ${gpsPinging ? 'animate-spin' : 'text-blue-600'}`} />
            <span>{gpsSuccess ? 'GPS Updated!' : gpsPinging ? 'Pinging...' : 'Ping GPS'}</span>
          </button>

          <div className="flex items-center space-x-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <div
              className={`w-3 h-3 rounded-full ${
                profile?.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="text-sm font-semibold text-slate-700">
              {profile?.isAvailable ? 'Online for Offers' : 'Offline'}
            </span>

            <button
              onClick={handleToggleAvailability}
              disabled={toggling}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                profile?.isAvailable
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  : isApproved
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {profile?.isAvailable ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>
      </div>

      {/* Error / Alert banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Verification Warning Card */}
      {!isApproved && (
        <div
          className={`p-5 rounded-2xl border ${
            isRejected ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          } space-y-3`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className={`font-bold text-base ${isRejected ? 'text-red-900' : 'text-amber-900'}`}>
                {isRejected ? 'Application Requires Resubmission' : 'Profile Awaiting Dispatcher Approval'}
              </h3>
              <p className={`text-xs ${isRejected ? 'text-red-700' : 'text-amber-700'}`}>
                {isRejected
                  ? `Rejection Reason: ${profile?.rejectionReason || 'Please review your uploaded documents'}`
                  : 'Independent technicians must be vetted with valid ID, license, and service area before receiving automated dispatch offers.'}
              </p>
            </div>
            <Link
              href="/technician/profile"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow ${
                isRejected ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              Update Profile & Documents &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. INCOMING SEQUENTIAL JOB OFFERS (WITH COUNTDOWN TIMER)  */}
      {/* ========================================================= */}
      {offers.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-lg font-black text-slate-900">
              Incoming Dispatch Offers ({offers.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => {
              const b = offer.booking || {};
              const expiryMs = new Date(offer.expiresAt).getTime() - currentTime;
              const secondsLeft = Math.max(0, Math.floor(expiryMs / 1000));
              const isUrgent = b.priority === 'urgent';

              return (
                <div
                  key={offer._id}
                  className="bg-white border-2 border-emerald-500 rounded-2xl p-5 shadow-lg space-y-4 relative overflow-hidden"
                >
                  {/* Countdown banner */}
                  <div className="flex justify-between items-center bg-emerald-50 -mx-5 -mt-5 px-5 py-2.5 border-b border-emerald-100">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-emerald-700 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-800">
                        Sequential Offer #{offer.attempt}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs font-extrabold text-emerald-900">
                      <span>Expires in:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-sm">
                        {secondsLeft}s
                      </span>
                    </div>
                  </div>

                  {/* Header info */}
                  <div className="flex justify-between items-start pt-1">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                          {b.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isUrgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {b.priority}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-400 mt-1">
                        Ticket: {b.ticketNumber || b._id}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">
                        ${b.pricing?.estimatedMin || 45} - ${b.pricing?.estimatedMax || 95}
                      </div>
                      <div className="text-[10px] text-slate-400">Estimated Earnings</div>
                    </div>
                  </div>

                  {/* Job details */}
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-slate-900 line-clamp-2">{b.description}</p>
                    <div className="flex items-center space-x-2 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{b.location?.address || 'San Francisco, CA'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono text-slate-600">{b.maskedPhone || '***-***-****'}</span>
                      <span className="text-[10px] text-slate-400 italic">(unmasked upon accept)</span>
                    </div>
                  </div>

                  {/* Distance & Matching Score */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-500">Distance: </span>
                      <span className="font-bold text-slate-800">{offer.distanceKm} km</span>
                      <span className="text-slate-400"> &bull; ETA {offer.etaMinutes} min</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Fit Score: </span>
                      <span className="font-extrabold text-emerald-700">{offer.totalScore}/100</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => handleAcceptOffer(offer._id)}
                      disabled={actionLoading || secondsLeft === 0}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{actionLoading ? 'Accepting...' : 'Accept Job'}</span>
                    </button>

                    <button
                      onClick={() => setRejectModalOffer(offer)}
                      disabled={actionLoading}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 font-bold text-xs transition flex items-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CURRENT ACTIVE JOB CARD & WORKFLOW CONTROLS            */}
      {/* ========================================================= */}
      {currentJob && (
        <div className="bg-white rounded-2xl border-2 border-blue-500 p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-100 text-blue-800">
                  Current Active Assignment
                </span>
                <span className="font-mono text-xs text-slate-400 font-bold">
                  {currentJob.ticketNumber}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1 capitalize">
                {currentJob.category} Service: {currentJob.service?.name || currentJob.description}
              </h3>
            </div>

            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800">
                Status: {currentJob.status?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Customer Contact & Unmasked Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="text-slate-400 font-semibold uppercase text-[10px]">Customer Contact</div>
              <div className="font-bold text-slate-900 text-sm">{currentJob.customer?.name}</div>
              <div className="flex items-center space-x-1.5 text-blue-700 font-bold font-mono">
                <Phone className="w-3.5 h-3.5" />
                <span>{currentJob.contactPhone}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Job Site Address</span>
                {currentJob.location?.coordinates && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${currentJob.location.coordinates[1]},${currentJob.location.coordinates[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>Open Navigation</span>
                    <Navigation className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="font-semibold text-slate-900">
                {currentJob.location?.address || 'San Francisco, CA'}
              </div>
              <div className="text-slate-500 text-[11px]">
                {currentJob.location?.landmark ? `Landmark: ${currentJob.location.landmark}` : ''}
              </div>
            </div>
          </div>

          {/* Workflow Step Transitions */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Progress Job:</span>

              {currentJob.status === 'assigned' && (
                <button
                  onClick={() => handleUpdateJobStatus('en_route')}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Start Travel (En Route)</span>
                </button>
              )}

              {currentJob.status === 'en_route' && (
                <button
                  onClick={() => handleUpdateJobStatus('arrived')}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Mark Arrived on Site</span>
                </button>
              )}

              {currentJob.status === 'arrived' && (
                <>
                  <button
                    onClick={() => setQuoteModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center space-x-1"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Submit Quotation</span>
                  </button>
                  <button
                    onClick={() => handleUpdateJobStatus('in_progress')}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center space-x-1"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Start Work (In Progress)</span>
                  </button>
                </>
              )}

              {currentJob.status === 'in_progress' && (
                <button
                  onClick={() => setCompleteModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Submit Completion Proof</span>
                </button>
              )}
            </div>

            {/* Cancel / Reassignment Button */}
            <button
              onClick={() => setCancelModalJob(currentJob)}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
            >
              Cancel / Release Job &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rating</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {profile?.rating?.toFixed(1) || '5.0'} ★
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Platform average: 4.8</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reliability Score</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{profile?.reliabilityScore || 100}%</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Acceptance & completion rate</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Jobs</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.activeJobCount}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            {profile?.isAvailable ? 'Ready for matching' : 'Currently offline'}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inventory In Stock</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{stats.inventoryCount} items</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Checked during dispatch filtering</div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/technician/inventory"
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 shadow-sm flex items-center justify-between group transition"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base">Parts & Stock</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Manage {stats.inventoryCount} items
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
        </Link>

        <Link
          href="/technician/profile"
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 shadow-sm flex items-center justify-between group transition"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base">Service Area & Skills</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Radius ({profile?.serviceArea?.radiusKm || 25} km)
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
        </Link>

        <Link
          href="/technician/earnings"
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500 shadow-sm flex items-center justify-between group transition"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base">Earnings & Settlements</div>
              <div className="text-xs text-slate-500 mt-0.5">
                ${profile?.totalEarnings?.toFixed(2) || '0.00'} earned
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
        </Link>
      </div>

      {/* Reject Offer Modal */}
      {rejectModalOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Decline Dispatch Offer</h3>
            <p className="text-xs text-slate-500">
              Please state your reason for declining. This ticket will automatically proceed to the next eligible technician candidate.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. In transit with another customer, tools unavailable, etc."
              rows={3}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setRejectModalOffer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                onClick={handleRejectOffer}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow"
              >
                {actionLoading ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Job / Reassignment Modal */}
      {cancelModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {cancelModalJob.status === 'assigned'
                ? 'Cancel & Release Booking'
                : 'Submit Reassignment Request'}
            </h3>
            <p className="text-xs text-slate-500">
              {cancelModalJob.status === 'assigned'
                ? 'Because travel has not yet started, this job will be immediately unassigned and re-dispatched to the next available technician candidate.'
                : 'Travel or service has already commenced. This reassignment requires dispatcher approval before the ticket can be re-routed.'}
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation / reassignment..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setCancelModalJob(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                onClick={handleCancelJob}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow"
              >
                {actionLoading ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Submission Modal */}
      {quoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-700">
              <Receipt className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">Submit Formal Service Quotation</h3>
            </div>
            <p className="text-xs text-slate-500">
              Provide an itemized breakdown for the customer. The customer will review and approve before work starts.
            </p>

            <form onSubmit={handleSubmitQuote} className="space-y-4">
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {quoteLineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs">
                    <input
                      type="text"
                      required
                      placeholder="Line item description (e.g. Copper coupling)"
                      value={item.description}
                      onChange={(e) => {
                        const copy = [...quoteLineItems];
                        copy[idx].description = e.target.value;
                        setQuoteLineItems(copy);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300"
                    />
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => {
                        const copy = [...quoteLineItems];
                        copy[idx].qty = Number(e.target.value);
                        setQuoteLineItems(copy);
                      }}
                      className="w-16 px-2 py-1.5 rounded-xl border border-slate-300 text-center"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="$ Unit"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const copy = [...quoteLineItems];
                        copy[idx].unitPrice = Number(e.target.value);
                        setQuoteLineItems(copy);
                      }}
                      className="w-20 px-2 py-1.5 rounded-xl border border-slate-300 text-right"
                    />
                    {quoteLineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuoteLineItems(quoteLineItems.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setQuoteLineItems([...quoteLineItems, { description: '', qty: 1, unitPrice: 0 }])}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line Item</span>
              </button>

              <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center text-xs font-bold text-slate-800">
                <span>Total Quotation:</span>
                <span className="text-base text-amber-600 font-black">
                  $
                  {quoteLineItems
                    .reduce((sum, i) => sum + (Number(i.qty) || 1) * (Number(i.unitPrice) || 0), 0)
                    .toFixed(2)}
                </span>
              </div>

              <textarea
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                placeholder="Additional notes for customer..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
              />

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuote}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow"
                >
                  {submittingQuote ? 'Submitting...' : 'Send Quotation to Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completion Proof Modal */}
      {completeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-lg font-bold text-slate-900">Submit Completion Evidence</h3>
            </div>
            <p className="text-xs text-slate-500">
              Provide work notes, final price, and upload photo evidence. Once verified, payout is automatically
              settled to your account.
            </p>

            <form onSubmit={handleSubmitCompletion} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Final Service Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={currentJob?.pricing?.baseAmount?.toString() || '95.00'}
                  value={completeFinalPrice}
                  onChange={(e) => setCompleteFinalPrice(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Work Description & Notes</label>
                <textarea
                  required
                  rows={3}
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="Describe repair or installation completed, pressure tests performed, etc."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Photo Evidence (JPG/PNG)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingComplete}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                >
                  {submittingComplete ? 'Uploading Proof...' : 'Submit Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
