const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const DispatchOffer = require('../../models/DispatchOffer');
const PlatformFee = require('../../models/PlatformFee');
const Payment = require('../../models/Payment');
const Payout = require('../../models/Payout');
const Review = require('../../models/Review');
const TechnicianProfile = require('../../models/TechnicianProfile');

/**
 * Escapes CSV formula injection risks for any string starting with =, +, -, @
 */
const escapeCsvCell = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Parses date range or defaults to last 30 days
 */
const parseDateRange = (from, to) => {
  const toDate = to ? new Date(to) : new Date();
  let fromDate;
  if (from) {
    fromDate = new Date(from);
  } else {
    fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const durationMs = toDate.getTime() - fromDate.getTime();
  const prevToDate = new Date(fromDate.getTime());
  const prevFromDate = new Date(fromDate.getTime() - durationMs);

  return { fromDate, toDate, prevFromDate, prevToDate, durationMs };
};

/**
 * Compute KPI metrics for a specified time window
 */
const computePeriodMetrics = async ({ fromDate, toDate, category, technicianId }) => {
  const bookingMatch = {
    createdAt: { $gte: fromDate, $lte: toDate },
  };
  if (category && category !== 'ALL') {
    bookingMatch.category = category.toLowerCase();
  }
  if (technicianId) {
    bookingMatch.assignedTechnician = new mongoose.Types.ObjectId(technicianId);
  }

  // 1. Booking aggregations: Total, Confirmed, Assigned, Completed, SLA, Reassigned, Timings
  const [bookingStats] = await Booking.aggregate([
    { $match: bookingMatch },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        confirmedCount: {
          $sum: {
            $cond: [
              { $in: ['$status', ['confirmed', 'assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled']] },
              1,
              0,
            ],
          },
        },
        assignedCount: {
          $sum: {
            $cond: [{ $ne: ['$assignedAt', null] }, 1, 0],
          },
        },
        completedCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
          },
        },
        reassignedCount: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $gt: ['$dispatch.attempts', 1] },
                  { $gt: [{ $size: { $ifNull: ['$dispatch.excludedTechnicians', []] } }, 0] },
                ],
              },
              1,
              0,
            ],
          },
        },
        slaEvaluatedCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'completed'] },
                  { $in: ['$sla.status', ['compliant', 'breached']] },
                ],
              },
              1,
              0,
            ],
          },
        },
        slaCompliantCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'completed'] },
                  {
                    $or: [
                      { $eq: ['$sla.status', 'compliant'] },
                      { $eq: ['$sla.met', true] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        // Assignment time (minutes) = (assignedAt - createdAt) / 60000
        totalAssignmentMinutes: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$assignedAt', null] },
                  { $ne: ['$createdAt', null] },
                  { $gte: ['$assignedAt', '$createdAt'] },
                ],
              },
              { $divide: [{ $subtract: ['$assignedAt', '$createdAt'] }, 60000] },
              0,
            ],
          },
        },
        assignedTimingSamples: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$assignedAt', null] },
                  { $ne: ['$createdAt', null] },
                  { $gte: ['$assignedAt', '$createdAt'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        // Arrival time (minutes) = (arrivedAt - assignedAt) / 60000
        totalArrivalMinutes: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$arrivedAt', null] },
                  { $ne: ['$assignedAt', null] },
                  { $gte: ['$arrivedAt', '$assignedAt'] },
                ],
              },
              { $divide: [{ $subtract: ['$arrivedAt', '$assignedAt'] }, 60000] },
              0,
            ],
          },
        },
        arrivalTimingSamples: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$arrivedAt', null] },
                  { $ne: ['$assignedAt', null] },
                  { $gte: ['$arrivedAt', '$assignedAt'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]) || [{}];

  const totalBookings = bookingStats?.totalBookings || 0;
  const confirmedCount = bookingStats?.confirmedCount || totalBookings;
  const assignedCount = bookingStats?.assignedCount || 0;
  const completedCount = bookingStats?.completedCount || 0;
  const reassignedCount = bookingStats?.reassignedCount || 0;
  const slaEvaluated = bookingStats?.slaEvaluatedCount || completedCount;
  const slaCompliant = bookingStats?.slaCompliantCount || 0;

  const dispatchSuccessRate = confirmedCount > 0 ? (assignedCount / confirmedCount) * 100 : 0;
  const jobCompletionRate = confirmedCount > 0 ? (completedCount / confirmedCount) * 100 : 0;
  const reassignmentRate = confirmedCount > 0 ? (reassignedCount / confirmedCount) * 100 : 0;
  const slaComplianceRate = slaEvaluated > 0 ? (slaCompliant / slaEvaluated) * 100 : 100;

  const avgAssignmentMinutes =
    bookingStats?.assignedTimingSamples > 0
      ? bookingStats.totalAssignmentMinutes / bookingStats.assignedTimingSamples
      : 0;

  const avgArrivalMinutes =
    bookingStats?.arrivalTimingSamples > 0
      ? bookingStats.totalArrivalMinutes / bookingStats.arrivalTimingSamples
      : 0;

  // 2. Dispatch Offer acceptance rate
  const offerMatch = {
    createdAt: { $gte: fromDate, $lte: toDate },
  };
  if (technicianId) {
    offerMatch.technician = new mongoose.Types.ObjectId(technicianId);
  }

  const [offerStats] = await DispatchOffer.aggregate([
    { $match: offerMatch },
    {
      $group: {
        _id: null,
        totalOffers: { $sum: 1 },
        acceptedOffers: {
          $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] },
        },
      },
    },
  ]) || [{}];

  const totalOffers = offerStats?.totalOffers || 0;
  const acceptedOffers = offerStats?.acceptedOffers || 0;
  const technicianAcceptanceRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0;

  // 3. Platform Fee Revenue from PlatformFee records
  const feeMatch = {
    capturedAt: { $gte: fromDate, $lte: toDate },
  };

  const [feeStats] = await PlatformFee.aggregate([
    { $match: feeMatch },
    {
      $group: {
        _id: null,
        totalFeeRevenue: { $sum: '$amount' },
        feeCount: { $sum: 1 },
      },
    },
  ]) || [{}];

  const platformRevenue = feeStats?.totalFeeRevenue || 0;
  const platformFeeCount = feeStats?.feeCount || 0;

  // 4. Gross Payment Volume and Payouts
  const paymentMatch = {
    createdAt: { $gte: fromDate, $lte: toDate },
    status: { $in: ['captured', 'authorized'] },
  };
  if (technicianId) {
    paymentMatch.technician = new mongoose.Types.ObjectId(technicianId);
  }

  const [paymentStats] = await Payment.aggregate([
    { $match: paymentMatch },
    {
      $group: {
        _id: null,
        grossVolume: { $sum: '$amount' },
        paymentCount: { $sum: 1 },
      },
    },
  ]) || [{}];

  const grossVolume = paymentStats?.grossVolume || 0;

  const payoutMatch = {
    createdAt: { $gte: fromDate, $lte: toDate },
    status: 'paid',
  };
  if (technicianId) {
    payoutMatch.technician = new mongoose.Types.ObjectId(technicianId);
  }

  const [payoutStats] = await Payout.aggregate([
    { $match: payoutMatch },
    {
      $group: {
        _id: null,
        netPayouts: { $sum: '$amount' },
        payoutCount: { $sum: 1 },
      },
    },
  ]) || [{}];

  const netPayouts = payoutStats?.netPayouts || 0;

  // 5. Customer Satisfaction / Reviews
  const reviewMatch = {
    createdAt: { $gte: fromDate, $lte: toDate },
  };
  if (technicianId) {
    reviewMatch.technician = new mongoose.Types.ObjectId(technicianId);
  }

  const [reviewStats] = await Review.aggregate([
    { $match: reviewMatch },
    {
      $group: {
        _id: null,
        avgRating: { $sum: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]) || [{}];

  const reviewCount = reviewStats?.reviewCount || 0;
  const customerSatisfaction = reviewCount > 0 ? reviewStats.avgRating / reviewCount : 5.0;

  return {
    totalBookings,
    confirmedCount,
    assignedCount,
    completedCount,
    dispatchSuccessRate: Number(dispatchSuccessRate.toFixed(1)),
    jobCompletionRate: Number(jobCompletionRate.toFixed(1)),
    reassignmentRate: Number(reassignmentRate.toFixed(1)),
    slaComplianceRate: Number(slaComplianceRate.toFixed(1)),
    avgAssignmentMinutes: Number(avgAssignmentMinutes.toFixed(1)),
    avgArrivalMinutes: Number(avgArrivalMinutes.toFixed(1)),
    totalOffers,
    acceptedOffers,
    technicianAcceptanceRate: Number(technicianAcceptanceRate.toFixed(1)),
    platformRevenue: Number(platformRevenue.toFixed(2)),
    platformFeeCount,
    grossVolume: Number(grossVolume.toFixed(2)),
    netPayouts: Number(netPayouts.toFixed(2)),
    customerSatisfaction: Number(customerSatisfaction.toFixed(2)),
    reviewCount,
  };
};

/**
 * Calculates percentage trend comparison: ((current - prev) / prev) * 100
 */
const calculateTrend = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

/**
 * Main KPI service returning Current Period, Previous Period, and Trends
 */
const getKpiSummary = async ({ from, to, category, technicianId }) => {
  const { fromDate, toDate, prevFromDate, prevToDate } = parseDateRange(from, to);

  const [current, previous] = await Promise.all([
    computePeriodMetrics({ fromDate, toDate, category, technicianId }),
    computePeriodMetrics({ fromDate: prevFromDate, toDate: prevToDate, category, technicianId }),
  ]);

  const trends = {
    dispatchSuccessRate: calculateTrend(current.dispatchSuccessRate, previous.dispatchSuccessRate),
    jobCompletionRate: calculateTrend(current.jobCompletionRate, previous.jobCompletionRate),
    reassignmentRate: calculateTrend(current.reassignmentRate, previous.reassignmentRate),
    slaComplianceRate: calculateTrend(current.slaComplianceRate, previous.slaComplianceRate),
    avgAssignmentMinutes: calculateTrend(current.avgAssignmentMinutes, previous.avgAssignmentMinutes),
    avgArrivalMinutes: calculateTrend(current.avgArrivalMinutes, previous.avgArrivalMinutes),
    technicianAcceptanceRate: calculateTrend(current.technicianAcceptanceRate, previous.technicianAcceptanceRate),
    platformRevenue: calculateTrend(current.platformRevenue, previous.platformRevenue),
    grossVolume: calculateTrend(current.grossVolume, previous.grossVolume),
    customerSatisfaction: calculateTrend(current.customerSatisfaction, previous.customerSatisfaction),
  };

  return {
    dateRange: {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      prevFrom: prevFromDate.toISOString(),
      prevTo: prevToDate.toISOString(),
    },
    current,
    previous,
    trends,
  };
};

/**
 * Daily Time Series for Charts
 */
const getTimeseries = async ({ from, to, category, technicianId }) => {
  const { fromDate, toDate } = parseDateRange(from, to);

  const bookingMatch = {
    createdAt: { $gte: fromDate, $lte: toDate },
  };
  if (category && category !== 'ALL') {
    bookingMatch.category = category.toLowerCase();
  }
  if (technicianId) {
    bookingMatch.assignedTechnician = new mongoose.Types.ObjectId(technicianId);
  }

  const dailyBookings = await Booking.aggregate([
    { $match: bookingMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalBookings: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        slaCompliantCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'completed'] },
                  {
                    $or: [
                      { $eq: ['$sla.status', 'compliant'] },
                      { $eq: ['$sla.met', true] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
        avgAssignmentTimeMin: {
          $avg: {
            $cond: [
              {
                $and: [
                  { $ne: ['$assignedAt', null] },
                  { $ne: ['$createdAt', null] },
                  { $gte: ['$assignedAt', '$createdAt'] },
                ],
              },
              { $divide: [{ $subtract: ['$assignedAt', '$createdAt'] }, 60000] },
              null,
            ],
          },
        },
        avgArrivalTimeMin: {
          $avg: {
            $cond: [
              {
                $and: [
                  { $ne: ['$arrivedAt', null] },
                  { $ne: ['$assignedAt', null] },
                  { $gte: ['$arrivedAt', '$assignedAt'] },
                ],
              },
              { $divide: [{ $subtract: ['$arrivedAt', '$assignedAt'] }, 60000] },
              null,
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Aggregate daily fees
  const feeMatch = {
    capturedAt: { $gte: fromDate, $lte: toDate },
  };
  const dailyFees = await PlatformFee.aggregate([
    { $match: feeMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$capturedAt' } },
        feeRevenue: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const feeMap = new Map();
  dailyFees.forEach((f) => feeMap.set(f._id, f.feeRevenue));

  // Category breakdown for donut/distribution chart
  const categoryBreakdown = await Booking.aggregate([
    { $match: bookingMatch },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
  ]);

  // Combine into continuous daily series
  const series = dailyBookings.map((day) => {
    const feeRevenue = feeMap.get(day._id) || 0;
    const slaRate =
      day.completedCount > 0
        ? Number(((day.slaCompliantCount / day.completedCount) * 100).toFixed(1))
        : 100;

    return {
      date: day._id,
      bookings: day.totalBookings,
      completed: day.completedCount,
      revenue: Number(feeRevenue.toFixed(2)),
      slaComplianceRate: slaRate,
      avgAssignmentMinutes: Number((day.avgAssignmentTimeMin || 0).toFixed(1)),
      avgArrivalMinutes: Number((day.avgArrivalTimeMin || 0).toFixed(1)),
    };
  });

  return {
    dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
    series,
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c._id,
      count: c.count,
    })),
  };
};

/**
 * Technician Performance Leaderboard / Table
 */
const getTechnicianPerformance = async ({ from, to, category }) => {
  const { fromDate, toDate } = parseDateRange(from, to);

  const bookingMatch = {
    assignedTechnician: { $ne: null },
    createdAt: { $gte: fromDate, $lte: toDate },
  };
  if (category && category !== 'ALL') {
    bookingMatch.category = category.toLowerCase();
  }

  const techStats = await Booking.aggregate([
    { $match: bookingMatch },
    {
      $group: {
        _id: '$assignedTechnician',
        totalAssigned: { $sum: 1 },
        completedJobs: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        cancelledJobs: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        onTimeArrivals: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$sla.milestones.arrival', 'met'] },
                  { $eq: ['$sla.status', 'compliant'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  // Populate profiles
  const profiles = await TechnicianProfile.find({
    _id: { $in: techStats.map((t) => t._id) },
  }).populate('user', 'name email phone avatar');

  const profileMap = new Map();
  profiles.forEach((p) => profileMap.set(p._id.toString(), p));

  // Compute offer acceptance per technician
  const offerStats = await DispatchOffer.aggregate([
    {
      $match: {
        technician: { $in: techStats.map((t) => t._id) },
        createdAt: { $gte: fromDate, $lte: toDate },
      },
    },
    {
      $group: {
        _id: '$technician',
        offers: { $sum: 1 },
        accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
      },
    },
  ]);

  const offerMap = new Map();
  offerStats.forEach((o) => offerMap.set(o._id.toString(), o));

  // Compute total earnings per technician
  const payoutStats = await Payout.aggregate([
    {
      $match: {
        technician: { $in: techStats.map((t) => t._id) },
        status: 'paid',
        createdAt: { $gte: fromDate, $lte: toDate },
      },
    },
    {
      $group: {
        _id: '$technician',
        earnings: { $sum: '$amount' },
      },
    },
  ]);

  const payoutMap = new Map();
  payoutStats.forEach((p) => payoutMap.set(p._id.toString(), p.earnings));

  const result = techStats.map((stat) => {
    const prof = profileMap.get(stat._id.toString());
    const offers = offerMap.get(stat._id.toString());
    const totalOffers = offers?.offers || 0;
    const acceptedOffers = offers?.accepted || 0;
    const acceptanceRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 100;
    const onTimeRate =
      stat.totalAssigned > 0 ? (stat.onTimeArrivals / stat.totalAssigned) * 100 : 100;
    const earnings = payoutMap.get(stat._id.toString()) || prof?.totalEarnings || 0;

    return {
      technicianId: stat._id,
      name: prof?.user?.name || 'Technician',
      email: prof?.user?.email || 'N/A',
      phone: prof?.user?.phone || 'N/A',
      category: prof?.serviceCategories?.join(', ') || 'General',
      rating: prof?.rating || 5.0,
      completedJobs: stat.completedJobs,
      cancelledJobs: stat.cancelledJobs,
      acceptanceRate: Number(acceptanceRate.toFixed(1)),
      onTimeRate: Number(onTimeRate.toFixed(1)),
      earnings: Number(earnings.toFixed(2)),
    };
  });

  return result.sort((a, b) => b.completedJobs - a.completedJobs);
};

/**
 * Generate CSV Report with Neutralized Formula Injection
 */
const generateCsvReport = async ({ type, from, to, category }) => {
  const { fromDate, toDate } = parseDateRange(from, to);

  if (type === 'bookings') {
    const match = { createdAt: { $gte: fromDate, $lte: toDate } };
    if (category && category !== 'ALL') match.category = category.toLowerCase();

    const bookings = await Booking.find(match)
      .populate('customer', 'name email')
      .populate({
        path: 'assignedTechnician',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Booking ID',
      'Created Date',
      'Category',
      'Priority',
      'Status',
      'Customer Name',
      'Customer Email',
      'Technician Name',
      'Price ($)',
      'SLA Status',
      'Address',
    ];

    const rows = bookings.map((b) => [
      escapeCsvCell(b._id),
      escapeCsvCell(new Date(b.createdAt).toISOString()),
      escapeCsvCell(b.category),
      escapeCsvCell(b.priority),
      escapeCsvCell(b.status),
      escapeCsvCell(b.customer?.name || ''),
      escapeCsvCell(b.customer?.email || ''),
      escapeCsvCell(b.assignedTechnician?.user?.name || 'Unassigned'),
      escapeCsvCell(b.price?.calculatedPrice || 0),
      escapeCsvCell(b.sla?.status || 'N/A'),
      escapeCsvCell(b.location?.address || ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  if (type === 'payments') {
    const match = { createdAt: { $gte: fromDate, $lte: toDate } };
    const payments = await Payment.find(match)
      .populate('customer', 'name email')
      .populate({
        path: 'technician',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('booking', 'category status')
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Payment ID',
      'Date',
      'Booking ID',
      'Category',
      'Amount ($)',
      'Status',
      'Customer',
      'Technician',
      'Gateway Ref',
    ];

    const rows = payments.map((p) => [
      escapeCsvCell(p._id),
      escapeCsvCell(new Date(p.createdAt).toISOString()),
      escapeCsvCell(p.booking?._id || ''),
      escapeCsvCell(p.booking?.category || ''),
      escapeCsvCell(p.amount),
      escapeCsvCell(p.status),
      escapeCsvCell(p.customer?.name || ''),
      escapeCsvCell(p.technician?.user?.name || ''),
      escapeCsvCell(p.gatewayRef || 'mock_pay'),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  if (type === 'sla') {
    const match = { createdAt: { $gte: fromDate, $lte: toDate } };
    if (category && category !== 'ALL') match.category = category.toLowerCase();

    const bookings = await Booking.find(match)
      .populate({
        path: 'assignedTechnician',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Booking ID',
      'Date',
      'Category',
      'Priority',
      'Status',
      'Technician',
      'SLA Overall Status',
      'Response Target (min)',
      'Arrival Target (min)',
      'Completion Target (min)',
    ];

    const rows = bookings.map((b) => [
      escapeCsvCell(b._id),
      escapeCsvCell(new Date(b.createdAt).toISOString()),
      escapeCsvCell(b.category),
      escapeCsvCell(b.priority),
      escapeCsvCell(b.status),
      escapeCsvCell(b.assignedTechnician?.user?.name || 'Unassigned'),
      escapeCsvCell(b.sla?.status || 'pending'),
      escapeCsvCell(b.sla?.targetMinutes?.response || ''),
      escapeCsvCell(b.sla?.targetMinutes?.arrival || ''),
      escapeCsvCell(b.sla?.targetMinutes?.completion || ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  if (type === 'technicians') {
    const list = await getTechnicianPerformance({ from, to, category });
    const headers = [
      'Technician ID',
      'Name',
      'Email',
      'Category',
      'Rating',
      'Completed Jobs',
      'Cancelled Jobs',
      'Acceptance Rate (%)',
      'On-Time Rate (%)',
      'Total Earnings ($)',
    ];

    const rows = list.map((t) => [
      escapeCsvCell(t.technicianId),
      escapeCsvCell(t.name),
      escapeCsvCell(t.email),
      escapeCsvCell(t.category),
      escapeCsvCell(t.rating),
      escapeCsvCell(t.completedJobs),
      escapeCsvCell(t.cancelledJobs),
      escapeCsvCell(t.acceptanceRate),
      escapeCsvCell(t.onTimeRate),
      escapeCsvCell(t.earnings),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  throw new Error(`Unsupported report type: ${type}`);
};

module.exports = {
  getKpiSummary,
  getTimeseries,
  getTechnicianPerformance,
  generateCsvReport,
  escapeCsvCell,
};
