const mongoose = require('mongoose');
const Payment = require('../../models/Payment');
const { mockPaymentGateway } = require('./mockPaymentGateway');

let sweeperTimer = null;

async function runReconciliationSweep() {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const stalePayments = await Payment.find({
      status: { $in: ['pending', 'authorized'] },
      updatedAt: { $lt: fifteenMinutesAgo },
    }).limit(20);

    for (const payment of stalePayments) {
      if (payment.gatewayRef) {
        const gwStatus = await mockPaymentGateway.getStatus(payment.gatewayRef);
        if (gwStatus.found && gwStatus.status === 'captured') {
          payment.status = 'captured';
          payment.ledger.push({
            status: 'captured',
            amount: payment.amount,
            note: 'Reconciled by background sweeper',
          });
          await payment.save();
        } else if (gwStatus.found && gwStatus.status === 'refunded') {
          payment.status = 'refunded';
          await payment.save();
        }
      } else {
        // Abandoned payment attempt
        payment.status = 'failed';
        payment.ledger.push({
          status: 'failed',
          amount: payment.amount,
          note: 'Expired without gateway confirmation',
        });
        await payment.save();
      }
    }
  } catch (err) {
    console.error('Payment reconciliation sweeper error:', err);
  }
}

function startPaymentReconciliationSweeper(intervalSeconds = 300) {
  if (sweeperTimer) return;
  sweeperTimer = setInterval(runReconciliationSweep, intervalSeconds * 1000);
}

function stopPaymentReconciliationSweeper() {
  if (sweeperTimer) {
    clearInterval(sweeperTimer);
    sweeperTimer = null;
  }
}

module.exports = {
  runReconciliationSweep,
  startPaymentReconciliationSweeper,
  stopPaymentReconciliationSweeper,
};
