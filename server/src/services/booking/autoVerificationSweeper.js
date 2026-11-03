const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const PlatformSettings = require('../../models/PlatformSettings');
const completionService = require('./completionService');

let autoVerifyTimer = null;

async function runAutoVerificationSweep() {
  if (mongoose.connection.readyState !== 1) return;

  try {
    let autoVerificationHours = 24;
    try {
      if (typeof PlatformSettings.getSettings === 'function') {
        const settings = await PlatformSettings.getSettings();
        if (settings.autoVerificationHours != null) {
          autoVerificationHours = settings.autoVerificationHours;
        }
      }
    } catch (e) {
      // Use fallback
    }

    const cutoff = new Date(Date.now() - autoVerificationHours * 3600 * 1000);

    const pendingBookings = await Booking.find({
      status: 'in_progress',
      'completion.status': 'submitted',
      'completion.submittedAt': { $lt: cutoff },
    }).limit(20);

    for (const booking of pendingBookings) {
      try {
        booking.completion.autoVerified = true;
        await completionService.verifyCompletion({
          bookingId: booking._id,
          actorId: booking.customer,
          role: 'customer',
          action: 'verify',
        });
      } catch (err) {
        console.error(`Auto-verification failed for booking ${booking._id}:`, err);
      }
    }
  } catch (err) {
    console.error('Auto verification sweep error:', err);
  }
}

function startAutoVerificationSweeper(intervalSeconds = 300) {
  if (autoVerifyTimer) return;
  autoVerifyTimer = setInterval(runAutoVerificationSweep, intervalSeconds * 1000);
}

function stopAutoVerificationSweeper() {
  if (autoVerifyTimer) {
    clearInterval(autoVerifyTimer);
    autoVerifyTimer = null;
  }
}

module.exports = {
  runAutoVerificationSweep,
  startAutoVerificationSweeper,
  stopAutoVerificationSweeper,
};
