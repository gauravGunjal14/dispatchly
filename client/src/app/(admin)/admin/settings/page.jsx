'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { 
  Settings, 
  Save, 
  Sliders, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2,
  HelpCircle,
  Activity
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Weights
  const [weights, setWeights] = useState({
    sla: 30,
    location: 25,
    skills: 15,
    workload: 10,
    inventory: 10,
    reliability: 10,
  });

  // General & Fees
  const [platformFee, setPlatformFee] = useState(1.5);
  const [offerExpirySeconds, setOfferExpirySeconds] = useState(60);
  const [currency, setCurrency] = useState('USD');
  const [urgentSurchargePct, setUrgentSurchargePct] = useState(20);
  const [deliveryPerKm, setDeliveryPerKm] = useState(1.5);

  // Operational & Sweepers
  const [atRiskThresholdPercent, setAtRiskThresholdPercent] = useState(80);
  const [sweeperIntervalSeconds, setSweeperIntervalSeconds] = useState(30);
  const [autoVerificationHours, setAutoVerificationHours] = useState(24);

  // Stakeholder Decisions
  const [feePayer, setFeePayer] = useState('technician');
  const [cancellationPolicy, setCancellationPolicy] = useState('free_before_start');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/admin/settings');
      if (res.success && res.data?.settings) {
        const s = res.data.settings;
        setSettings(s);
        if (s.dispatchWeights) setWeights(s.dispatchWeights);
        if (s.platformFeePerTicket !== undefined) setPlatformFee(s.platformFeePerTicket);
        if (s.offerExpirySeconds !== undefined) setOfferExpirySeconds(s.offerExpirySeconds);
        if (s.currency) setCurrency(s.currency);
        if (s.pricingConfig?.urgentSurchargePercentage !== undefined) {
          setUrgentSurchargePct(s.pricingConfig.urgentSurchargePercentage);
        }
        if (s.pricingConfig?.deliveryPricePerKm !== undefined) {
          setDeliveryPerKm(s.pricingConfig.deliveryPricePerKm);
        }
        if (s.slaMonitoring?.atRiskThresholdPercent !== undefined) {
          setAtRiskThresholdPercent(s.slaMonitoring.atRiskThresholdPercent);
        }
        if (s.slaMonitoring?.sweeperIntervalSeconds !== undefined) {
          setSweeperIntervalSeconds(s.slaMonitoring.sweeperIntervalSeconds);
        }
        if (s.autoVerificationHours !== undefined) {
          setAutoVerificationHours(s.autoVerificationHours);
        }
        if (s.feePayer) setFeePayer(s.feePayer);
        if (s.cancellationPolicy) setCancellationPolicy(s.cancellationPolicy);
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to fetch settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const totalWeight =
    Number(weights.sla || 0) +
    Number(weights.location || 0) +
    Number(weights.skills || 0) +
    Number(weights.workload || 0) +
    Number(weights.inventory || 0) +
    Number(weights.reliability || 0);

  const isWeightValid = totalWeight === 100;

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isWeightValid) {
      setMessage({ text: `Dispatch weights must sum to exactly 100% (currently ${totalWeight}%)`, type: 'error' });
      return;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await apiClient('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          platformFeePerTicket: Number(platformFee),
          currency,
          offerExpirySeconds: Number(offerExpirySeconds),
          dispatchWeights: {
            sla: Number(weights.sla),
            location: Number(weights.location),
            skills: Number(weights.skills),
            workload: Number(weights.workload),
            inventory: Number(weights.inventory),
            reliability: Number(weights.reliability),
          },
          pricingConfig: {
            urgentSurchargePercentage: Number(urgentSurchargePct),
            deliveryPricePerKm: Number(deliveryPerKm),
          },
          slaMonitoring: {
            atRiskThresholdPercent: Number(atRiskThresholdPercent),
            sweeperIntervalSeconds: Number(sweeperIntervalSeconds),
          },
          autoVerificationHours: Number(autoVerificationHours),
          feePayer,
          cancellationPolicy,
        }),
      });

      if (res.success) {
        setSettings(res.data.settings);
        setMessage({ text: 'Platform configuration saved and audit logged!', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading platform settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900">Dispatch Engine Settings</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
              Operations Config
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic optimization weights, platform fees, SLA monitoring thresholds, and governance policies
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving || !isWeightValid}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl border text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 1. Dispatch Scoring Weights */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>Multi-Factor Candidate Ranking Weights</span>
            </h2>
            <p className="text-xs text-slate-500">
              Weights used by Phase 4 engine to normalize and composite candidate scores (0-100).
            </p>
          </div>

          <div
            className={`px-3 py-1 rounded-xl text-xs font-bold border ${
              isWeightValid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-red-50 text-red-700 border-red-300'
            }`}
          >
            Total Weight: {totalWeight}% / 100%
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              SLA Feasibility (Default 30%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={weights.sla}
              onChange={(e) => setWeights({ ...weights, sla: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Travel Time / Location (Default 25%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={weights.location}
              onChange={(e) => setWeights({ ...weights, location: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Skills & Experience (Default 15%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={weights.skills}
              onChange={(e) => setWeights({ ...weights, skills: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Workload Penalty (Default 10%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={weights.workload}
              onChange={(e) => setWeights({ ...weights, workload: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Inventory Readiness (Default 10%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={weights.inventory}
              onChange={(e) => setWeights({ ...weights, inventory: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reliability & Ratings (Default 10%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={weights.reliability}
              onChange={(e) => setWeights({ ...weights, reliability: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>
        </div>
      </div>

      {/* 2. Platform Fees & Dispatch Timeouts */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>Platform Fees & Dispatch Timer</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Platform Fee per Ticket ($)
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              value={platformFee}
              onChange={(e) => setPlatformFee(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Configurable platform fee (default $1.50) collected once per completed ticket.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Technician Offer Expiry (Seconds)
            </label>
            <input
              type="number"
              min="15"
              max="300"
              value={offerExpirySeconds}
              onChange={(e) => setOfferExpirySeconds(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Default countdown before offer automatically expires and reassigns to candidate #2.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Urgent Surcharge (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={urgentSurchargePct}
              onChange={(e) => setUrgentSurchargePct(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Delivery Transit Fee ($ / km)
            </label>
            <input
              type="number"
              step="0.10"
              min="0"
              value={deliveryPerKm}
              onChange={(e) => setDeliveryPerKm(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
          </div>
        </div>
      </div>

      {/* 3. SLA Monitoring & Background Sweepers */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <span>SLA Monitoring & Background Sweepers</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              SLA At-Risk Threshold (%)
            </label>
            <input
              type="number"
              min="50"
              max="95"
              value={atRiskThresholdPercent}
              onChange={(e) => setAtRiskThresholdPercent(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Triggers proactive notification when SLA target elapsed reaches this % (default 80%).
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              SLA Sweeper Interval (Sec)
            </label>
            <input
              type="number"
              min="5"
              max="300"
              value={sweeperIntervalSeconds}
              onChange={(e) => setSweeperIntervalSeconds(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Frequency of periodic active job milestone checks (default 30s).
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Auto-Verify Window (Hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={autoVerificationHours}
              onChange={(e) => setAutoVerificationHours(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Auto-verifies completion if customer takes no action within window (default 24h).
            </span>
          </div>
        </div>
      </div>

      {/* 4. Pending Stakeholder Decisions (Business Governance) */}
      <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h2 className="text-base font-bold text-slate-900">
            Pending Stakeholder Decisions (PRD Open Governance Items)
          </h2>
        </div>
        <p className="text-xs text-amber-800">
          The following parameters are currently configurable and active in the platform, but represent pending stakeholder business policy sign-offs.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Decision 1: Platform Fee Payer */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Platform Fee Payer
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Pending Decision
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              PRD Item #1: Who absorbs the $1.50 ticket fee?
            </p>
            <select
              value={feePayer}
              onChange={(e) => setFeePayer(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium"
            >
              <option value="technician">Deduct from Technician payout (Current Default)</option>
              <option value="customer">Add surcharge to Customer booking total</option>
              <option value="split">Split 50/50 ($0.75 technician / $0.75 customer)</option>
            </select>
          </div>

          {/* Decision 2: Cancellation Policy */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Cancellation / Travel Fee
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Pending Decision
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              PRD Item #2: Customer cancellation policy after technician commences travel.
            </p>
            <select
              value={cancellationPolicy}
              onChange={(e) => setCancellationPolicy(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium"
            >
              <option value="free_before_start">Free cancellation before work starts (Current Default)</option>
              <option value="fee_after_quote_reject">Flat $15 dispatch fee if quote rejected after arrival</option>
            </select>
          </div>

          {/* Decision 3: Payout Schedule */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Technician Payout Schedule
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Pending Decision
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              PRD Item #3: Payout disbursement cadence.
            </p>
            <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium">
              Currently implemented as <strong className="text-emerald-700">Instant Real-Time Payout</strong> upon job completion and verification. Stakeholders may switch to weekly batch bank payouts post-pilot.
            </div>
          </div>

          {/* Decision 4: Unresolved Dispute Timeout */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                4. Dispute Resolution Escalation
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                Pending Decision
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              PRD Item #4: Behavior if dispute remains unresolved after 7 days.
            </p>
            <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-medium">
              Currently routed to <strong className="text-purple-700">Mandatory Dispatcher Mediation</strong> via Disputes Queue. Automated 7-day 50% split refund remains pending executive approval.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
