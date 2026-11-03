const PlatformSettings = require('../models/PlatformSettings');
const AuditLog = require('../models/AuditLog');

// Get current platform settings
const getSettings = async (req, res, next) => {
  try {
    const settings = await PlatformSettings.getSettings();
    return res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

// Update platform settings (Audit-logged)
const updateSettings = async (req, res, next) => {
  try {
    let settings = await PlatformSettings.getSettings();

    const previousState = settings.toObject();

    const { platformFeePerTicket, currency, offerExpirySeconds, dispatchWeights, slaTargets, pricingConfig } =
      req.body;

    if (platformFeePerTicket !== undefined) settings.platformFeePerTicket = platformFeePerTicket;
    if (currency) settings.currency = currency;
    if (offerExpirySeconds !== undefined) settings.offerExpirySeconds = offerExpirySeconds;
    if (dispatchWeights) settings.dispatchWeights = dispatchWeights;
    if (slaTargets) settings.slaTargets = slaTargets;
    if (pricingConfig) settings.pricingConfig = pricingConfig;

    await settings.save();

    await AuditLog.create({
      action: 'platform_settings_updated',
      performedBy: req.user._id,
      role: req.user.role,
      targetEntity: 'PlatformSettings',
      entityId: settings._id,
      details: {
        updatedFields: Object.keys(req.body),
        previousWeights: previousState.dispatchWeights,
        newWeights: settings.dispatchWeights,
      },
      ipAddress: req.ip || '',
    });

    return res.json({
      success: true,
      data: { settings },
      message: 'Platform settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
