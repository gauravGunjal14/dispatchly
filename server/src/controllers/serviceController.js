const ServiceCatalog = require('../models/ServiceCatalog');
const AuditLog = require('../models/AuditLog');

// Public: List active services
const listServices = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category) query.category = category.toLowerCase();

    const services = await ServiceCatalog.find(query).sort({ category: 1, basePrice: 1 });

    return res.json({
      success: true,
      data: { services },
    });
  } catch (error) {
    next(error);
  }
};

// Public: Get single service details
const getServiceDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const service = await ServiceCatalog.findById(id);

    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found or is currently inactive' },
      });
    }

    return res.json({
      success: true,
      data: { service },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: List all services (including inactive)
const adminListServices = async (req, res, next) => {
  try {
    const services = await ServiceCatalog.find().sort({ category: 1, createdAt: -1 });
    return res.json({
      success: true,
      data: { services },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Create service
const createService = async (req, res, next) => {
  try {
    const { code } = req.body;
    const existing = await ServiceCatalog.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_SERVICE_CODE', message: `Service with code '${code}' already exists` },
      });
    }

    const service = await ServiceCatalog.create(req.body);

    await AuditLog.create({
      action: 'service_created',
      performedBy: req.user._id,
      role: req.user.role,
      targetEntity: 'ServiceCatalog',
      entityId: service._id,
      details: { serviceCode: service.code, name: service.name, category: service.category },
      ipAddress: req.ip || '',
    });

    return res.status(201).json({
      success: true,
      data: { service },
      message: 'Service created successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update service
const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const service = await ServiceCatalog.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found' },
      });
    }

    Object.assign(service, req.body);
    await service.save();

    await AuditLog.create({
      action: 'service_updated',
      performedBy: req.user._id,
      role: req.user.role,
      targetEntity: 'ServiceCatalog',
      entityId: service._id,
      details: { serviceCode: service.code, updates: req.body },
      ipAddress: req.ip || '',
    });

    return res.json({
      success: true,
      data: { service },
      message: 'Service updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Toggle active state
const toggleServiceActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const service = await ServiceCatalog.findById(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found' },
      });
    }

    service.isActive = !service.isActive;
    await service.save();

    await AuditLog.create({
      action: service.isActive ? 'service_activated' : 'service_deactivated',
      performedBy: req.user._id,
      role: req.user.role,
      targetEntity: 'ServiceCatalog',
      entityId: service._id,
      details: { serviceCode: service.code, isActive: service.isActive },
      ipAddress: req.ip || '',
    });

    return res.json({
      success: true,
      data: { service },
      message: `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listServices,
  getServiceDetail,
  adminListServices,
  createService,
  updateService,
  toggleServiceActive,
};
