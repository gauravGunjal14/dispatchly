const TechnicianProfile = require('../models/TechnicianProfile');
const TechnicianDocument = require('../models/TechnicianDocument');
const InventoryItem = require('../models/InventoryItem');
const storageService = require('../services/storage/storageService');

// Get current technician profile
const getMyProfile = async (req, res, next) => {
  try {
    let profile = await TechnicianProfile.findOne({ user: req.user._id }).populate('user', 'name email phone avatar');

    if (!profile) {
      // Auto-initialize profile for technician user if not existing
      profile = await TechnicianProfile.create({
        user: req.user._id,
        serviceCategories: ['plumbing'],
      });
      profile = await profile.populate('user', 'name email phone avatar');
    }

    const documents = await TechnicianDocument.find({
      $or: [{ technician: profile._id }, { technician: req.user._id }],
    }).sort({ createdAt: -1 });
    const inventoryCount = await InventoryItem.countDocuments({ technician: profile._id });

    return res.json({
      success: true,
      data: {
        profile,
        documents,
        stats: {
          inventoryCount,
          activeJobCount: profile.activeJobCount,
          rating: profile.rating,
          reliabilityScore: profile.reliabilityScore,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update profile (allows resubmission if rejected)
const updateMyProfile = async (req, res, next) => {
  try {
    let profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new TechnicianProfile({ user: req.user._id });
    }

    const {
      serviceCategories,
      skills,
      qualifications,
      experienceYears,
      serviceArea,
      vehicleType,
      packageCapacityKg,
      workingHours,
    } = req.body;

    if (serviceCategories) profile.serviceCategories = serviceCategories;
    if (skills) profile.skills = skills;
    if (qualifications) profile.qualifications = qualifications;
    if (experienceYears !== undefined) profile.experienceYears = experienceYears;
    if (serviceArea) {
      if (serviceArea.center?.coordinates?.length === 2) {
        let lng = Number(serviceArea.center.coordinates[0]);
        let lat = Number(serviceArea.center.coordinates[1]);
        lng = Number((((lng + 180) % 360 + 360) % 360 - 180).toFixed(6));
        lat = Number(Math.max(-90, Math.min(90, lat)).toFixed(6));
        serviceArea.center.coordinates = [lng, lat];
      }
      profile.serviceArea = serviceArea;
    }
    if (vehicleType) profile.vehicleType = vehicleType;
    if (packageCapacityKg !== undefined) profile.packageCapacityKg = packageCapacityKg;
    if (workingHours) profile.workingHours = workingHours;

    // If profile was rejected, updating allows resubmission for review
    if (profile.verificationStatus === 'rejected') {
      profile.verificationStatus = 'pending';
      profile.rejectionReason = '';
    }

    await profile.save();

    return res.json({
      success: true,
      data: { profile },
      message: 'Technician profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Availability (Enforce: only approved technicians can go available)
const toggleAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;
    const profile = await TechnicianProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    // Hard rule: Only approved technicians can set isAvailable = true
    if (isAvailable && profile.verificationStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'VERIFICATION_REQUIRED',
          message: 'Only approved technicians can become available for dispatch offers.',
        },
      });
    }

    profile.isAvailable = Boolean(isAvailable);
    await profile.save();

    return res.json({
      success: true,
      data: {
        isAvailable: profile.isAvailable,
        verificationStatus: profile.verificationStatus,
      },
      message: `Availability updated to ${profile.isAvailable ? 'Online' : 'Offline'}`,
    });
  } catch (error) {
    next(error);
  }
};

// Update Location with validation and timestamp
const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const profile = await TechnicianProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    profile.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
      updatedAt: new Date(),
    };

    await profile.save();

    return res.json({
      success: true,
      data: {
        currentLocation: profile.currentLocation,
      },
      message: 'Location updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Upload document (Multer handled)
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE_UPLOADED', message: 'No file was provided for upload' },
      });
    }

    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const { docType = 'id_proof', notes = '' } = req.body;

    const saved = await storageService.saveFile({
      file: req.file,
      subfolder: 'documents',
    });

    const doc = await TechnicianDocument.create({
      technician: profile._id,
      docType,
      filePath: saved.storageKey,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      size: saved.size,
      notes,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      data: { document: doc },
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
};

// List my documents
const getMyDocuments = async (req, res, next) => {
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const documents = await TechnicianDocument.find({
      $or: [{ technician: profile._id }, { technician: req.user._id }],
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
};

// Download / stream document with strict ownership or admin check
const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await TechnicianDocument.findById(id).populate('technician');

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'DOCUMENT_NOT_FOUND', message: 'Requested document does not exist' },
      });
    }

    // Check ownership: user must be the document owner OR an admin
    const isOwner = doc.technician.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to view or download this document' },
      });
    }

    const stream = storageService.getFileStream(doc.filePath);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    return stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// Inventory CRUD
const getInventory = async (req, res, next) => {
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const items = await InventoryItem.find({ technician: profile._id }).sort({ name: 1 });

    return res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    next(error);
  }
};

const addInventoryItem = async (req, res, next) => {
  try {
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const { name, category, partCode, quantity, reservedQuantity, unit, unitCost, lowStockThreshold } = req.body;

    // Check duplicate partCode for this technician
    const existing = await InventoryItem.findOne({ technician: profile._id, partCode: partCode.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_PART_CODE', message: `Part code '${partCode}' already exists in your inventory` },
      });
    }

    const item = await InventoryItem.create({
      technician: profile._id,
      name,
      category,
      partCode,
      quantity,
      reservedQuantity: reservedQuantity || 0,
      unit: unit || 'pcs',
      unitCost: unitCost || 0,
      lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : 5,
    });

    return res.status(201).json({
      success: true,
      data: { item },
      message: 'Inventory item added successfully',
    });
  } catch (error) {
    next(error);
  }
};

const updateInventoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const item = await InventoryItem.findOne({ _id: id, technician: profile._id });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: 'Inventory item not found in your inventory' },
      });
    }

    const { name, category, quantity, reservedQuantity, unit, unitCost, lowStockThreshold } = req.body;

    if (name) item.name = name;
    if (category) item.category = category;
    if (quantity !== undefined) item.quantity = quantity;
    if (reservedQuantity !== undefined) item.reservedQuantity = reservedQuantity;
    if (unit) item.unit = unit;
    if (unitCost !== undefined) item.unitCost = unitCost;
    if (lowStockThreshold !== undefined) item.lowStockThreshold = lowStockThreshold;

    if (item.reservedQuantity > item.quantity) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Reserved quantity cannot exceed total stock quantity' },
      });
    }

    await item.save();

    return res.json({
      success: true,
      data: { item },
      message: 'Inventory item updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

const deleteInventoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await TechnicianProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Technician profile not found' },
      });
    }

    const item = await InventoryItem.findOne({ _id: id, technician: profile._id });
    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: 'Inventory item not found in your inventory' },
      });
    }

    if (item.reservedQuantity > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ITEM_RESERVED',
          message: 'Cannot delete item with currently reserved parts for an active job assignment',
        },
      });
    }

    await item.deleteOne();

    return res.json({
      success: true,
      message: 'Inventory item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  toggleAvailability,
  updateLocation,
  uploadDocument,
  getMyDocuments,
  downloadDocument,
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
};
