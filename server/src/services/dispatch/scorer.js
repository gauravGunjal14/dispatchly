/**
 * Dispatch Scorer
 * Pure function that calculates normalized 0-100 scores across 6 factors
 * and combines them using configurable platform weights.
 */

/**
 * Calculates normalized factor scores and the weighted total score for a candidate technician.
 * @param {object} params
 * @param {object} params.technician TechnicianProfile document
 * @param {object} params.booking Booking document
 * @param {object} params.routeInfo { distanceKm, etaMinutes }
 * @param {Array} params.inventoryItems List of InventoryItem documents for this technician
 * @param {object} params.settings PlatformSettings document
 * @returns {{ totalScore: number, scoreBreakdown: object, distanceKm: number, etaMinutes: number }}
 */
const scoreCandidate = ({
  technician,
  booking,
  routeInfo = { distanceKm: 5, etaMinutes: 15 },
  inventoryItems = [],
  settings = {},
}) => {
  const weights = settings?.dispatchWeights || {
    sla: 30,
    location: 25,
    skills: 15,
    workload: 10,
    inventory: 10,
    reliability: 10,
  };

  const { distanceKm = 0, etaMinutes = 0 } = routeInfo;
  const maxRadius = settings?.maxCandidateRadiusKm || 25;
  const maxJobs = settings?.workloadMaxActiveJobs || 3;

  // 1. SLA Score (0-100)
  const categorySla = settings?.slaTargets?.[booking.category]?.[booking.priority || 'normal'];
  const targetMinutes = categorySla?.arrivalMinutes || 60;
  let slaScore = 100;
  if (etaMinutes <= 0) {
    slaScore = 100;
  } else if (etaMinutes <= targetMinutes) {
    // 100 down to 50 as ETA approaches SLA target
    slaScore = Math.max(50, Math.round(100 - (etaMinutes / targetMinutes) * 50));
  } else {
    // ETA exceeds SLA target, drops from 50 towards 0
    slaScore = Math.max(0, Math.round(50 * (1 - (etaMinutes - targetMinutes) / targetMinutes)));
  }

  // 2. Location Score (0-100)
  const locationScore = Math.max(
    0,
    Math.min(100, Math.round(100 * (1 - Math.min(distanceKm, maxRadius) / maxRadius)))
  );

  // 3. Skills Score (0-100)
  const expYears = technician.experienceYears || 1;
  const expBonus = Math.min(20, Math.max(0, (expYears - 1) * 4)); // Up to +20 pts
  const qualificationsCount = (technician.qualifications || []).length;
  const extraSkillsCount = Math.max(
    0,
    (technician.skills || []).length - (booking.requirementSnapshot?.requiredSkills || []).length
  );
  const qualificationsBonus = Math.min(10, qualificationsCount * 5 + extraSkillsCount * 2);
  const skillsScore = Math.min(100, 70 + expBonus + qualificationsBonus);

  // 4. Workload Score (0-100)
  const activeJobs = technician.activeJobCount || 0;
  const workloadScore = Math.max(
    0,
    Math.min(100, Math.round(100 * (1 - Math.min(activeJobs, maxJobs) / maxJobs)))
  );

  // 5. Inventory Score (0-100)
  let inventoryScore = 100;
  if (booking.category === 'delivery') {
    const pkgWeight = booking.packageWeightKg || booking.requirementSnapshot?.minPackageCapacityKg || 1;
    const capacity = technician.packageCapacityKg || 0;
    if (pkgWeight <= 0) {
      inventoryScore = 100;
    } else {
      const buffer = capacity / pkgWeight;
      // 1x = 75, 2x+ = 100
      inventoryScore = Math.min(100, Math.max(0, Math.round(50 + Math.min(buffer, 2) * 25)));
    }
  } else {
    const requiredParts = booking.requirementSnapshot?.requiredParts || [];
    if (requiredParts.length > 0) {
      let totalStockRatio = 0;
      for (const reqPart of requiredParts) {
        const item = inventoryItems.find(
          (inv) =>
            (inv.partCode && inv.partCode.toLowerCase() === reqPart.partCode?.toLowerCase()) ||
            (inv.name && inv.name.toLowerCase() === (reqPart.name || reqPart.partCode)?.toLowerCase())
        );
        const available = item ? Math.max(0, (item.quantity || 0) - (item.reservedQuantity || 0)) : 0;
        const needed = reqPart.quantity || 1;
        const ratio = Math.min(3, available / needed); // Cap abundance at 3x
        totalStockRatio += ratio;
      }
      const avgRatio = totalStockRatio / requiredParts.length;
      // 1x = 70, 2x = 90, 3x = 100
      inventoryScore = Math.min(100, Math.max(0, Math.round(avgRatio * 33.33)));
    }
  }

  // 6. Reliability Score (0-100)
  const rawReliability = technician.reliabilityScore != null ? technician.reliabilityScore : 100;
  const ratingNormalized = ((technician.rating != null ? technician.rating : 5) / 5) * 100;
  const reliabilityScore = Math.round(0.6 * rawReliability + 0.4 * ratingNormalized);

  // Normalized Score Breakdown
  const scoreBreakdown = {
    sla: slaScore,
    location: locationScore,
    skills: skillsScore,
    workload: workloadScore,
    inventory: inventoryScore,
    reliability: reliabilityScore,
  };

  // Weighted Total
  const totalScoreRaw =
    (scoreBreakdown.sla * (weights.sla || 0) +
      scoreBreakdown.location * (weights.location || 0) +
      scoreBreakdown.skills * (weights.skills || 0) +
      scoreBreakdown.workload * (weights.workload || 0) +
      scoreBreakdown.inventory * (weights.inventory || 0) +
      scoreBreakdown.reliability * (weights.reliability || 0)) /
    100;

  const totalScore = Math.round(totalScoreRaw * 100) / 100;

  return {
    totalScore,
    scoreBreakdown,
    distanceKm,
    etaMinutes,
  };
};

module.exports = {
  scoreCandidate,
};
