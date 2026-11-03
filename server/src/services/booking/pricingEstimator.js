// Pure function to calculate Haversine distance in kilometers between two [lng, lat] points
const calculateHaversineDistanceKm = (coord1, coord2) => {
  if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) return 0;
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth's mean radius in km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

/**
 * Pure Pricing Estimator
 * @param {Object} params
 * @param {Object} params.service - ServiceCatalog document or plain object
 * @param {string} [params.priority='normal'] - 'normal' | 'urgent'
 * @param {Object} [params.pickupLocation] - GeoJSON Point { coordinates: [lng, lat] }
 * @param {Object} [params.dropoffLocation] - GeoJSON Point { coordinates: [lng, lat] }
 * @param {Object} [params.platformSettings] - PlatformSettings
 * @returns {Object} Price estimate details
 */
const calculateEstimate = ({
  service,
  priority = 'normal',
  pickupLocation,
  dropoffLocation,
  platformSettings,
}) => {
  if (!service) {
    throw new Error('Service is required for price estimation');
  }

  const currency = platformSettings?.currency || 'USD';
  const pricingType = service.pricingType || 'fixed';

  // Quotation-based service (complex custom jobs)
  if (pricingType === 'quotation') {
    return {
      type: 'quotation',
      quotationRequired: true,
      estimatedMin: 0,
      estimatedMax: 0,
      currency,
      baseAmount: 0,
      distanceKm: 0,
      urgentSurcharge: 0,
      breakdown: {
        notice: 'Custom quotation required upon technician on-site evaluation.',
      },
    };
  }

  let min = 0;
  let max = 0;
  let base = 0;

  if (pricingType === 'fixed') {
    base = Number(service.basePrice) || 0;
    min = base;
    max = base;
  } else if (pricingType === 'range') {
    min = Number(service.minPrice) || 0;
    max = Number(service.maxPrice) || min;
    base = Number(service.basePrice) || (min + max) / 2;
  }

  // Delivery distance calculation
  let distanceKm = 0;
  let distanceFee = 0;
  const isDelivery = service.category === 'delivery';

  if (isDelivery && pickupLocation?.coordinates && dropoffLocation?.coordinates) {
    distanceKm = calculateHaversineDistanceKm(pickupLocation.coordinates, dropoffLocation.coordinates);
    const ratePerKm = platformSettings?.pricingConfig?.deliveryPricePerKm || 1.5;
    distanceFee = Math.round(distanceKm * ratePerKm * 100) / 100;

    min += distanceFee;
    max += distanceFee;
    base += distanceFee;
  }

  // Urgent Priority Surcharge
  let urgentSurcharge = 0;
  if (priority === 'urgent') {
    const surchargePct = platformSettings?.pricingConfig?.urgentSurchargePercentage || 20;
    urgentSurcharge = Math.round(((base * surchargePct) / 100) * 100) / 100;

    min += urgentSurcharge;
    max += urgentSurcharge;
    base += urgentSurcharge;
  }

  return {
    type: pricingType,
    quotationRequired: false,
    estimatedMin: Math.round(min * 100) / 100,
    estimatedMax: Math.round(max * 100) / 100,
    baseAmount: Math.round(base * 100) / 100,
    currency,
    distanceKm,
    urgentSurcharge,
    breakdown: {
      baseServicePrice: service.basePrice || 0,
      distanceFee,
      distanceKm,
      urgentSurcharge,
      priority,
    },
  };
};

module.exports = {
  calculateHaversineDistanceKm,
  calculateEstimate,
};
