/**
 * SLA Monitoring Service
 * Evaluates real-time SLA health, detects at-risk & breached milestones,
 * triggers automated reassignment (pre-travel) or dispatcher approval requests (post-travel),
 * and computes final compliance records upon completion.
 */

const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const PlatformSettings = require('../../models/PlatformSettings');
const ReassignmentRequest = require('../../models/ReassignmentRequest');
const { cancelJobByTechnician } = require('../dispatch/reassignmentService');
const { emitToTicket, emitToAdmin } = require('../socketService');
const { notifyAdmins, createNotification } = require('../notificationService');

/**
 * Evaluates the SLA health of an active booking.
 * @param {object} booking Mongoose Booking document
 * @param {object} settings PlatformSettings document
 * @returns {Promise<{ state: string, details: object }>}
 */
const evaluateBookingSla = async (booking, settings) => {
  if (!booking || ['completed', 'cancelled', 'failed'].includes(booking.status)) {
    return { state: booking?.sla?.state || 'ok', details: {} };
  }

  const now = Date.now();
  const thresholdPercent = settings?.slaMonitoring?.atRiskThresholdPercent || 80;
  const thresholdRatio = thresholdPercent / 100;

  let computedState = 'ok';
  const breaches = [];
  const atRisks = [];

  const createdAt = new Date(booking.createdAt).getTime();
  const responseDeadline = booking.sla?.responseDeadline ? new Date(booking.sla.responseDeadline).getTime() : null;
  const arrivalDeadline = booking.sla?.arrivalDeadline ? new Date(booking.sla.arrivalDeadline).getTime() : null;
  const completionDeadline = booking.sla?.completionDeadline ? new Date(booking.sla.completionDeadline).getTime() : null;

  // 1. Response Milestone (Booking creation -> Assigned)
  if (!booking.assignedTechnician) {
    if (responseDeadline) {
      if (now > responseDeadline) {
        breaches.push({ milestone: 'response', message: 'Response deadline exceeded without technician assignment' });
      } else {
        const windowDuration = responseDeadline - createdAt;
        const elapsed = now - createdAt;
        if (windowDuration > 0 && elapsed / windowDuration >= thresholdRatio) {
          atRisks.push({ milestone: 'response', message: `${thresholdPercent}% of response SLA window elapsed without assignment` });
        }
      }
    }
  }

  // 2. Arrival Milestone (Assigned -> Arrived)
  if (['assigned', 'en_route'].includes(booking.status)) {
    if (arrivalDeadline) {
      const assignedAt = booking.assignedAt ? new Date(booking.assignedAt).getTime() : createdAt;
      const windowDuration = arrivalDeadline - assignedAt;
      const elapsed = now - assignedAt;

      // Projected arrival using dynamic ETA if available
      const etaMinutes = booking.eta?.minutes != null ? booking.eta.minutes : 15;
      const projectedArrival = now + etaMinutes * 60 * 1000;

      if (now > arrivalDeadline) {
        breaches.push({ milestone: 'arrival', message: 'Arrival deadline exceeded before technician reached site' });
      } else if (projectedArrival > arrivalDeadline) {
        atRisks.push({ milestone: 'arrival', message: `Projected arrival (${etaMinutes} min) exceeds deadline` });
      } else if (booking.status === 'assigned' && windowDuration > 0 && elapsed / windowDuration >= thresholdRatio) {
        atRisks.push({ milestone: 'arrival', message: `${thresholdPercent}% of arrival window elapsed and travel not yet started` });
      }
    }
  }

  // 3. Completion Milestone (Work started -> Completed)
  if (['arrived', 'in_progress'].includes(booking.status)) {
    if (completionDeadline) {
      const startedAt = booking.startedAt ? new Date(booking.startedAt).getTime() : (booking.arrivedAt ? new Date(booking.arrivedAt).getTime() : createdAt);
      const windowDuration = completionDeadline - startedAt;
      const elapsed = now - startedAt;

      if (now > completionDeadline) {
        breaches.push({ milestone: 'completion', message: 'Completion deadline exceeded' });
      } else if (windowDuration > 0 && elapsed / windowDuration >= thresholdRatio) {
        atRisks.push({ milestone: 'completion', message: `${thresholdPercent}% of completion window elapsed` });
      }
    }
  }

  if (breaches.length > 0) {
    computedState = 'breached';
  } else if (atRisks.length > 0) {
    computedState = 'at_risk';
  } else {
    computedState = 'ok';
  }

  const previousState = booking.sla?.state || 'ok';
  booking.sla = booking.sla || {};
  booking.sla.state = computedState;

  if (computedState === 'breached' && !booking.sla.breachedAt) {
    booking.sla.breachedAt = new Date(now);
  }

  // Action on escalation to at_risk or breached
  if (computedState !== 'ok' && computedState !== previousState) {
    await booking.save();

    // Alert dispatchers and ticket room
    emitToAdmin('sla:warning', {
      bookingId: booking._id,
      ticketNumber: booking.ticketNumber,
      category: booking.category,
      priority: booking.priority,
      status: booking.status,
      state: computedState,
      breaches,
      atRisks,
    });

    emitToTicket(booking._id, 'sla:status', {
      bookingId: booking._id,
      state: computedState,
    });

    if (mongoose.connection.readyState === 1) {
      await notifyAdmins({
        type: computedState === 'breached' ? 'sla_breach' : 'sla_warning',
        title: `SLA ${computedState.toUpperCase()}: Ticket ${booking.ticketNumber}`,
        body: `Ticket has entered ${computedState} status: ${(breaches[0] || atRisks[0])?.message}`,
        data: { bookingId: booking._id },
      });

      // Reassignment rules per PRD:
      // At risk BEFORE travel started -> auto-trigger reassignmentService
      if (computedState === 'at_risk' && booking.status === 'assigned' && booking.assignedTechnician) {
        console.log(`[SLA Service] Auto-reassignment triggered for pre-travel ticket ${booking.ticketNumber}`);
        await cancelJobByTechnician(
          booking._id,
          booking.assignedTechnician,
          'Auto-reassigned due to SLA arrival risk before travel commenced'
        );
      }
      // At risk AFTER en_route -> create ReassignmentRequest for admin approval
      else if (
        (computedState === 'at_risk' || computedState === 'breached') &&
        ['en_route', 'arrived'].includes(booking.status) &&
        booking.assignedTechnician
      ) {
        const existingReq = await ReassignmentRequest.findOne({
          booking: booking._id,
          status: 'pending',
        });
        if (!existingReq) {
          await ReassignmentRequest.create({
            booking: booking._id,
            technician: booking.assignedTechnician,
            reason: `Automated SLA alert: ${breaches[0]?.message || atRisks[0]?.message}`,
            status: 'pending',
          });
        }
      }
    }
  } else {
    await booking.save();
  }

  return { state: computedState, details: { breaches, atRisks } };
};

/**
 * Calculates and records the final SLA compliance outcome when a booking completes.
 * @param {object} booking
 */
const finalizeSlaCompliance = (booking) => {
  if (!booking || !booking.sla) return;

  const finalResult = {
    response: 'waived',
    arrival: 'waived',
    completion: 'waived',
  };

  if (booking.sla.responseDeadline && booking.assignedAt) {
    finalResult.response = booking.assignedAt <= booking.sla.responseDeadline ? 'met' : 'missed';
  }

  if (booking.sla.arrivalDeadline && booking.arrivedAt) {
    finalResult.arrival = booking.arrivedAt <= booking.sla.arrivalDeadline ? 'met' : 'missed';
  }

  if (booking.sla.completionDeadline && booking.completedAt) {
    finalResult.completion = booking.completedAt <= booking.sla.completionDeadline ? 'met' : 'missed';
  }

  booking.sla.finalResult = finalResult;
};

module.exports = {
  evaluateBookingSla,
  finalizeSlaCompliance,
};
