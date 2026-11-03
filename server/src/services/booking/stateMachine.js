const BOOKING_STATUSES = [
  'draft',
  'searching',
  'offered',
  'assigned',
  'en_route',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'failed',
];

const ALLOWED_TRANSITIONS = {
  draft: ['searching', 'cancelled'],
  searching: ['offered', 'assigned', 'cancelled', 'failed'],
  offered: ['assigned', 'searching', 'cancelled', 'failed'],
  assigned: ['en_route', 'cancelled', 'failed'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'failed'],
  completed: [],
  cancelled: [],
  failed: ['searching'], // Admin or system can re-dispatch a failed ticket
};

const canTransition = (currentStatus, targetStatus) => {
  if (!currentStatus || !targetStatus) return false;
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(targetStatus));
};

const validateTransition = (currentStatus, targetStatus) => {
  if (!BOOKING_STATUSES.includes(targetStatus)) {
    const error = new Error(`Invalid target status: '${targetStatus}'`);
    error.statusCode = 400;
    error.code = 'INVALID_STATUS';
    throw error;
  }

  if (!canTransition(currentStatus, targetStatus)) {
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    const error = new Error(
      `Illegal status transition from '${currentStatus}' to '${targetStatus}'. Allowed next states: [${allowed.join(', ')}]`
    );
    error.statusCode = 400;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }

  return true;
};

module.exports = {
  BOOKING_STATUSES,
  ALLOWED_TRANSITIONS,
  canTransition,
  validateTransition,
};
