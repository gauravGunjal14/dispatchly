/**
 * Expiry Sweeper
 * Background timer that periodically polls for expired pending offers,
 * transitions them, and advances the dispatch engine to the next candidate.
 */

const { expireOffers } = require('./offerService');
const PlatformSettings = require('../../models/PlatformSettings');

let timer = null;
let isRunning = false;

const runSweep = async () => {
  if (isRunning) return;
  isRunning = true;
  try {
    const count = await expireOffers();
    if (count > 0) {
      console.log(`[Expiry Sweeper] Processed ${count} expired dispatch offer(s)`);
    }
  } catch (err) {
    console.error('[Expiry Sweeper] Error during sweep:', err);
  } finally {
    isRunning = false;
  }
};

const startSweeper = async (intervalMs = null) => {
  if (timer) clearInterval(timer);

  let ms = intervalMs;
  if (!ms) {
    try {
      const settings = await PlatformSettings.getSettings();
      ms = (settings?.sweeperIntervalSeconds || 5) * 1000;
    } catch {
      ms = 5000;
    }
  }

  // Immediate recovery sweep on boot
  runSweep().catch(() => {});

  timer = setInterval(runSweep, ms);
  console.log(`[Expiry Sweeper] Started (interval: ${ms / 1000}s)`);
};

const stopSweeper = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[Expiry Sweeper] Stopped');
  }
};

module.exports = {
  startSweeper,
  stopSweeper,
  runSweep,
};
