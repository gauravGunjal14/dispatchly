const crypto = require('crypto');
const PaymentGateway = require('./paymentGateway');

/**
 * Mock Payment Gateway
 * Simulates external card/payment processor.
 * Allows simulating failures via test card numbers (e.g., 4000000000000002),
 * specific amounts (e.g., 999.99), or explicit simulateFailure flag.
 */
class MockPaymentGateway extends PaymentGateway {
  constructor() {
    super();
    this.transactions = new Map();
  }

  async authorize({ amount, currency = 'USD', paymentMethod = {}, idempotencyKey }) {
    if (this._shouldFail({ amount, paymentMethod })) {
      return {
        success: false,
        error: 'Card declined: Insufficient funds or invalid card',
        code: 'card_declined',
      };
    }

    const transactionId = `txn_mock_${crypto.randomBytes(8).toString('hex')}`;
    const record = {
      transactionId,
      amount,
      currency,
      status: 'authorized',
      createdAt: new Date(),
    };
    this.transactions.set(transactionId, record);

    return {
      success: true,
      transactionId,
      status: 'authorized',
    };
  }

  async capture({ amount, currency = 'USD', paymentMethod = {}, idempotencyKey, simulateFailure }) {
    if (simulateFailure || this._shouldFail({ amount, paymentMethod })) {
      return {
        success: false,
        error: 'Payment capture failed: Card processor declined transaction',
        code: 'capture_declined',
      };
    }

    const transactionId = `txn_mock_${crypto.randomBytes(8).toString('hex')}`;
    const record = {
      transactionId,
      amount,
      currency,
      status: 'captured',
      createdAt: new Date(),
    };
    this.transactions.set(transactionId, record);

    return {
      success: true,
      transactionId,
      status: 'captured',
      amount,
      currency,
    };
  }

  async refund({ transactionId, amount, reason = 'requested_by_customer' }) {
    const record = this.transactions.get(transactionId);
    if (!record) {
      // Mock gateway still permits refunding if validly shaped
      const refundId = `ref_mock_${crypto.randomBytes(8).toString('hex')}`;
      return {
        success: true,
        refundId,
        amount,
        status: 'refunded',
      };
    }

    const refundId = `ref_mock_${crypto.randomBytes(8).toString('hex')}`;
    record.status = 'refunded';
    return {
      success: true,
      refundId,
      amount: amount || record.amount,
      status: 'refunded',
    };
  }

  async getStatus(transactionId) {
    const record = this.transactions.get(transactionId);
    if (!record) {
      return { found: false, status: 'unknown' };
    }
    return { found: true, ...record };
  }

  _shouldFail({ amount, paymentMethod = {} }) {
    if (paymentMethod.simulateFailure) return true;
    if (paymentMethod.cardNumber && paymentMethod.cardNumber.endsWith('0002')) return true;
    if (amount === 999.99) return true;
    return false;
  }
}

const mockPaymentGateway = new MockPaymentGateway();

module.exports = {
  PaymentGateway,
  MockPaymentGateway,
  mockPaymentGateway,
};
