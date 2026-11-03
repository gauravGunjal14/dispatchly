/**
 * Payment Gateway Abstract Interface
 * Any payment provider (Stripe, Adyen, Mock, etc.) should implement these methods.
 */
class PaymentGateway {
  /**
   * Authorize a payment hold
   */
  async authorize(params) {
    throw new Error('authorize() not implemented');
  }

  /**
   * Capture a payment
   */
  async capture(params) {
    throw new Error('capture() not implemented');
  }

  /**
   * Refund a captured payment
   */
  async refund(params) {
    throw new Error('refund() not implemented');
  }

  /**
   * Get transaction status from gateway
   */
  async getStatus(transactionId) {
    throw new Error('getStatus() not implemented');
  }
}

module.exports = PaymentGateway;
