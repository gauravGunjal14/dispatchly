const User = require('../models/User');
const TechnicianProfile = require('../models/TechnicianProfile');
const TechnicianDocument = require('../models/TechnicianDocument');
const InventoryItem = require('../models/InventoryItem');
const AuditLog = require('../models/AuditLog');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Payout = require('../models/Payout');
const PlatformFee = require('../models/PlatformFee');
const Dispute = require('../models/Dispute');
const ReassignmentRequest = require('../models/ReassignmentRequest');
const kpiService = require('../services/kpi/kpiService');

// List technicians with filters and pagination
const listTechnicians = async (req, res, next) => {
  try {
    const { status, category, isAvailable, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.verificationStatus = status;
    if (category) query.serviceCategories = category;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let technicianQuery = TechnicianProfile.find(query)
      .populate('user', 'name email phone avatar createdAt isActive')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await TechnicianProfile.countDocuments(query);
    const technicians = await technicianQuery;

    // Filter out orphaned records with missing users and apply search
    let filteredTechnicians = technicians.filter((t) => t.user != null);
    if (search) {
      const s = search.toLowerCase();
      filteredTechnicians = filteredTechnicians.filter(
        (t) => t.user?.name?.toLowerCase().includes(s) || t.user?.email?.toLowerCase().includes(s)
      );
    }

    return res.json({
      success: true,
      data: {
        technicians: filteredTechnicians,
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
          limit: parseInt(limit, 10),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single technician details
const getTechnicianDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    let profile = await TechnicianProfile.findById(id)
      .populate('user', 'name email phone avatar createdAt isActive')
      .populate('verifiedBy', 'name email');

    if (!profile) {
      profile = await TechnicianProfile.findOne({ user: id })
        .populate('user', 'name email phone avatar createdAt isActive')
        .populate('verifiedBy', 'name email');
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Technician not found' },
      });
    }

    const documents = await TechnicianDocument.find({
      $or: [
        { technician: profile._id },
        { technician: profile.user?._id || profile.user },
      ],
    }).sort({ createdAt: -1 });

    const inventory = await InventoryItem.find({
      $or: [
        { technician: profile._id },
        { technician: profile.user?._id || profile.user },
      ],
    }).sort({ name: 1 });

    return res.json({
      success: true,
      data: {
        profile,
        documents,
        inventory,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Verify or Reject technician
const verifyTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    let profile = await TechnicianProfile.findById(id).populate('user', 'name email');
    if (!profile) {
      profile = await TechnicianProfile.findOne({ user: id }).populate('user', 'name email');
    }
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const oldStatus = profile.verificationStatus;

    if (action === 'approved') {
      profile.verificationStatus = 'approved';
      profile.rejectionReason = '';
      profile.verifiedBy = req.user._id;
      profile.verifiedAt = new Date();
      // Mark pending documents as verified
      await TechnicianDocument.updateMany({ technician: profile._id, status: 'pending' }, { status: 'verified' });
    } else if (action === 'rejected') {
      profile.verificationStatus = 'rejected';
      profile.rejectionReason = rejectionReason || 'Application rejected by platform dispatcher';
      profile.verifiedBy = req.user._id;
      profile.verifiedAt = new Date();
      // If was available, take offline
      profile.isAvailable = false;
    }

    await profile.save();

    // Write AuditLog entry
    await AuditLog.create({
      action: `technician_${action}`,
      performedBy: req.user._id,
      role: req.user.role,
      targetEntity: 'TechnicianProfile',
      entityId: profile._id,
      details: {
        technicianUserId: profile.user?._id,
        technicianName: profile.user?.name,
        previousStatus: oldStatus,
        newStatus: profile.verificationStatus,
        rejectionReason: profile.rejectionReason,
      },
      ipAddress: req.ip || '',
    });

    // Emit real-time notification to technician room
    if (req.io && profile.user?._id) {
      req.io.to(`user:${profile.user._id}`).emit('technician:status', {
        verificationStatus: profile.verificationStatus,
        rejectionReason: profile.rejectionReason,
        verifiedAt: profile.verifiedAt,
      });
    }

    return res.json({
      success: true,
      data: {
        profile,
      },
      message: `Technician successfully ${action}`,
    });
  } catch (error) {
    next(error);
  }
};

// 4. KPI Endpoints
const getKpis = async (req, res, next) => {
  try {
    const { from, to, category, technicianId } = req.query;
    const [summary, technicians] = await Promise.all([
      kpiService.getKpiSummary({ from, to, category, technicianId }),
      kpiService.getTechnicianPerformance({ from, to, category }),
    ]);

    return res.json({
      success: true,
      data: {
        ...summary,
        technicians,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTimeseries = async (req, res, next) => {
  try {
    const { from, to, category, technicianId } = req.query;
    const timeseries = await kpiService.getTimeseries({ from, to, category, technicianId });

    return res.json({
      success: true,
      data: timeseries,
    });
  } catch (error) {
    next(error);
  }
};

const getReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { from, to, category } = req.query;
    const csvData = await kpiService.generateCsvReport({ type, from, to, category });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="dispatchly_${type}_report_${Date.now()}.csv"`);
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};

// 5. Live Operations Panel Snapshot
const getOperationsPanel = async (req, res, next) => {
  try {
    const [
      activeDispatchesByState,
      exhaustedCount,
      atRiskCount,
      breachedCount,
      pendingVerifications,
      openDisputes,
      pendingReassignments,
    ] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            status: { $in: ['confirmed', 'assigned', 'en_route', 'arrived', 'in_progress'] },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Booking.countDocuments({ 'dispatch.state': { $in: ['exhausted', 'manual'] }, status: 'searching' }),
      Booking.countDocuments({
        status: { $in: ['confirmed', 'assigned', 'en_route', 'arrived', 'in_progress'] },
        'sla.status': 'at_risk',
      }),
      Booking.countDocuments({
        status: { $in: ['confirmed', 'assigned', 'en_route', 'arrived', 'in_progress'] },
        'sla.status': 'breached',
      }),
      TechnicianProfile.countDocuments({ verificationStatus: 'pending' }),
      Dispute.countDocuments({ status: 'open' }),
      ReassignmentRequest.countDocuments({ status: 'pending' }),
    ]);

    const stateMap = {};
    activeDispatchesByState.forEach((s) => {
      stateMap[s._id] = s.count;
    });

    return res.json({
      success: true,
      data: {
        activeByState: {
          confirmed: stateMap.confirmed || 0,
          assigned: stateMap.assigned || 0,
          en_route: stateMap.en_route || 0,
          arrived: stateMap.arrived || 0,
          in_progress: stateMap.in_progress || 0,
        },
        queues: {
          exhaustedManual: exhaustedCount,
          atRiskSla: atRiskCount,
          breachedSla: breachedCount,
          pendingVerifications,
          openDisputes,
          pendingReassignments,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 6. User Management
const listUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role && role !== 'ALL') query.role = role;
    if (status) query.isActive = status === 'active';
    if (search) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { phone: { $regex: s, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    return res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
          limit: parseInt(limit, 10),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    if (user.role === 'admin' && user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'You cannot deactivate your own admin account' },
      });
    }

    const oldStatus = user.isActive;
    user.isActive = isActive;
    // Invalidate any existing active JWTs for this user by incrementing tokenVersion
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // If technician is deactivated, make them offline
    if (!isActive && user.role === 'technician') {
      await TechnicianProfile.updateOne({ user: user._id }, { isAvailable: false });
    }

    // Write audit log
    await AuditLog.create({
      action: isActive ? 'user_reactivated' : 'user_deactivated',
      performedBy: req.user._id,
      role: req.user.role,
      targetEntity: 'User',
      entityId: user._id,
      details: {
        targetEmail: user.email,
        targetRole: user.role,
        previousState: oldStatus,
        newState: isActive,
        reason: reason || 'Admin action',
      },
      ipAddress: req.ip || '',
    });

    return res.json({
      success: true,
      data: { user },
      message: `User account has been ${isActive ? 'reactivated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// 7. Audit Log Viewer
const listAuditLogs = async (req, res, next) => {
  try {
    const { actor, action, entity, from, to, page = 1, limit = 25 } = req.query;
    const query = {};

    if (action) query.action = { $regex: action, $options: 'i' };
    if (entity) query.targetEntity = entity;
    if (actor) {
      const userMatch = await User.find({
        $or: [{ name: { $regex: actor, $options: 'i' } }, { email: { $regex: actor, $options: 'i' } }],
      }).select('_id');
      query.performedBy = { $in: userMatch.map((u) => u._id) };
    }
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
          limit: parseInt(limit, 10),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 8. Payment Ledger & Financial Management
const listPaymentsLedger = async (req, res, next) => {
  try {
    const { status, from, to, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'ALL') query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('customer', 'name email')
      .populate({
        path: 'technician',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('booking', 'ticketNumber category status finalPrice')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    // Summary totals
    const [totals] = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalVolume: { $sum: '$amount' },
          capturedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'captured'] }, 1, 0] },
          },
          refundedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] },
          },
        },
      },
    ]) || [{}];

    const feesTotal = await PlatformFee.aggregate([
      {
        $group: {
          _id: null,
          totalFees: { $sum: '$amount' },
        },
      },
    ]);

    return res.json({
      success: true,
      data: {
        payments,
        summary: {
          totalVolume: totals?.totalVolume || 0,
          capturedCount: totals?.capturedCount || 0,
          refundedCount: totals?.refundedCount || 0,
          platformFeesCollected: feesTotal[0]?.totalFees || 0,
        },
        pagination: {
          total,
          page: parseInt(page, 10),
          pages: Math.ceil(total / parseInt(limit, 10)),
          limit: parseInt(limit, 10),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listTechnicians,
  getTechnicianDetails,
  verifyTechnician,
  getKpis,
  getTimeseries,
  getReport,
  getOperationsPanel,
  listUsers,
  toggleUserStatus,
  listAuditLogs,
  listPaymentsLedger,
};
