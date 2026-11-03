/**
 * Pure calculation function for technician reliability score.
 * Formula per PRD:
 * - 40% offer acceptance rate
 * - 40% SLA compliance rate
 * - 20% low-cancellation rate (completion without tech cancellations)
 * Result is an integer between 0 and 100.
 *
 * @param {object} stats
 * @param {number} stats.offersReceived - Total offers received
 * @param {number} stats.offersAccepted - Total offers accepted
 * @param {number} stats.slaEligible - Total completed jobs with SLA tracking
 * @param {number} stats.slaMet - Total jobs where all SLAs were met
 * @param {number} stats.assignedJobs - Total jobs assigned
 * @param {number} stats.cancelledByTech - Total jobs cancelled by technician after acceptance
 * @returns {number} Score between 0 and 100
 */
function calculateReliabilityScore({
  offersReceived = 0,
  offersAccepted = 0,
  slaEligible = 0,
  slaMet = 0,
  assignedJobs = 0,
  cancelledByTech = 0,
}) {
  // If brand new technician with no history, default to 100
  if (offersReceived === 0 && assignedJobs === 0) {
    return 100;
  }

  // 1. Acceptance rate (40%)
  const acceptanceRate = offersReceived > 0 ? offersAccepted / offersReceived : 1.0;

  // 2. SLA compliance rate (40%)
  const slaRate = slaEligible > 0 ? slaMet / slaEligible : 1.0;

  // 3. Low-cancellation rate (20%)
  const nonCancellationRate =
    assignedJobs > 0 ? Math.max(0, 1 - cancelledByTech / assignedJobs) : 1.0;

  const score = Math.round(acceptanceRate * 40 + slaRate * 40 + nonCancellationRate * 20);

  return Math.min(100, Math.max(0, score));
}

module.exports = {
  calculateReliabilityScore,
};
