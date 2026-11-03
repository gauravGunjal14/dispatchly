/**
 * Candidate Ranking Service
 * Sorts scored candidates descending by total score, with deterministic tie-breaking.
 */

/**
 * Ranks an array of scored candidate objects.
 * @param {Array<{ technician: object, totalScore: number, scoreBreakdown: object, distanceKm: number, etaMinutes: number }>} scoredCandidates
 * @returns {Array<{ rank: number, technician: object, totalScore: number, scoreBreakdown: object, distanceKm: number, etaMinutes: number }>}
 */
const rankCandidates = (scoredCandidates = []) => {
  const sorted = [...scoredCandidates].sort((a, b) => {
    // 1. Primary: Total Score descending (0.01 threshold)
    const scoreDiff = b.totalScore - a.totalScore;
    if (Math.abs(scoreDiff) >= 0.01) {
      return scoreDiff;
    }

    // 2. Tie-break 1: Lower ETA first
    const etaDiff = (a.etaMinutes || 0) - (b.etaMinutes || 0);
    if (Math.abs(etaDiff) >= 1) {
      return etaDiff;
    }

    // 3. Tie-break 2: Higher reliability score first
    const relA = a.technician?.reliabilityScore != null ? a.technician.reliabilityScore : 100;
    const relB = b.technician?.reliabilityScore != null ? b.technician.reliabilityScore : 100;
    if (relB !== relA) {
      return relB - relA;
    }

    // 4. Tie-break 3: Lower active job count first
    const jobsA = a.technician?.activeJobCount || 0;
    const jobsB = b.technician?.activeJobCount || 0;
    if (jobsA !== jobsB) {
      return jobsA - jobsB;
    }

    // 5. Deterministic fallback by technician ID
    const idA = a.technician?._id?.toString() || '';
    const idB = b.technician?._id?.toString() || '';
    return idA.localeCompare(idB);
  });

  return sorted.map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
  }));
};

module.exports = {
  rankCandidates,
};
