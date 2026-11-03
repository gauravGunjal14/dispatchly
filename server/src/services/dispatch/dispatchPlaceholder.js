/**
 * Dispatch Service Placeholder (Phase 3)
 * Full candidate filtering, ranking, and sequential offers are implemented in Phase 4.
 */
const startDispatch = async (bookingId) => {
  console.log(`[Dispatch Engine Placeholder] Initiating intelligent dispatch for booking: ${bookingId}`);
  return {
    status: 'initiated',
    bookingId,
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  startDispatch,
};
