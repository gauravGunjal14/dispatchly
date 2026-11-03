/**
 * SLA Sweeper
 * Periodic background task that audits active tickets against SLA targets.
 */

const Booking = require('../../models/Booking');
const PlatformSettings = require('../../models/PlatformSettings');
const { evaluateBookingSla } = require('./slaService');

let timer = null;
let isRunning = false;

const runSlaSweep = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const settings = await PlatformSettings.getSettings();
    const activeBookings = await Booking.find({
      status: { $in: ['searching', 'offered', 'assigned', 'en_route', 'arrived', 'in_progress'] },
    });

    for (const booking of activeBookings) {
      try {
        await evaluateBookingSla(booking, settings);
      } catch (err) {
        console.error(`[SLA Sweeper] Error evaluating booking ${booking._id}:`, err);
      }
    }
  } catch (err) {
    console.error('[SLA Sweeper Error]', err);
  } finally {
    isRunning = false;
  }
};

const startSlaSweeper = async (intervalMs = null) => {
  if (timer) clearInterval(timer);

  let ms = intervalMs;
  if (!ms) {
    try {
      const settings = await PlatformSettings.getSettings();
      ms = (settings?.slaMonitoring?.sweeperIntervalSeconds || 30) * 1000;
    } catch {
      ms = 30000;
    }
  }

  // Immediate sweep on startup
  runSlaSweep().catch(() => {});

  timer = setInterval(runSlaSweep, ms);
  console.log(`[SLA Sweeper] Started (interval: ${ms / 1000}s)`);
};

const stopSlaSweeper = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[SLA Sweeper] Stopped');
  }
};

module.exports = {
  startSlaSweeper,
  stopSlaSweeper,
  runSlaSweep,
};
