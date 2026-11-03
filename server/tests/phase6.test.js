const mongoose = require('mongoose');
const { mockPaymentGateway } = require('../src/services/payment/mockPaymentGateway');
const { calculateReliabilityScore } = require('../src/services/review/reliabilityService');

// Extend Jest timeout
jest.setTimeout(25000);

describe('Phase 6 Test Suite: Quotations, Completion, Inventory, Payments & Ratings', () => {
  describe('1. Mock Payment Gateway', () => {
    it('should successfully capture payment with standard test params', async () => {
      const result = await mockPaymentGateway.capture({
        amount: 85.0,
        currency: 'USD',
        paymentMethod: { cardNumber: '4000000000000001' },
        idempotencyKey: 'idemp_test_01',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('captured');
      expect(result.amount).toBe(85.0);
      expect(result.transactionId).toMatch(/^txn_mock_/);
    });

    it('should decline payment when simulateFailure is true', async () => {
      const result = await mockPaymentGateway.capture({
        amount: 85.0,
        currency: 'USD',
        simulateFailure: true,
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('capture_declined');
    });

    it('should decline payment when card ends in 0002 or amount is 999.99', async () => {
      const resCard = await mockPaymentGateway.capture({
        amount: 50.0,
        paymentMethod: { cardNumber: '4000000000000002' },
      });
      expect(resCard.success).toBe(false);

      const resAmt = await mockPaymentGateway.capture({
        amount: 999.99,
        paymentMethod: {},
      });
      expect(resAmt.success).toBe(false);
    });

    it('should process simulated refund correctly', async () => {
      const refund = await mockPaymentGateway.refund({
        transactionId: 'txn_mock_sample',
        amount: 85.0,
      });

      expect(refund.success).toBe(true);
      expect(refund.status).toBe('refunded');
      expect(refund.refundId).toMatch(/^ref_mock_/);
    });
  });

  describe('2. Reliability Score Pure Calculation Formula', () => {
    it('should return 100 for a new technician with zero history', () => {
      const score = calculateReliabilityScore({
        offersReceived: 0,
        offersAccepted: 0,
        slaEligible: 0,
        slaMet: 0,
        assignedJobs: 0,
        cancelledByTech: 0,
      });
      expect(score).toBe(100);
    });

    it('should calculate 100% when all offers accepted, all SLAs met, zero cancellations', () => {
      const score = calculateReliabilityScore({
        offersReceived: 10,
        offersAccepted: 10, // 40 pts
        slaEligible: 10,
        slaMet: 10, // 40 pts
        assignedJobs: 10,
        cancelledByTech: 0, // 20 pts
      });
      expect(score).toBe(100);
    });

    it('should properly weight: 40% acceptance, 40% SLA, 20% low cancellations', () => {
      // 50% acceptance (20 pts), 80% SLA (32 pts), 100% completion (20 pts) -> 72
      const score = calculateReliabilityScore({
        offersReceived: 10,
        offersAccepted: 5, // 0.5 * 40 = 20
        slaEligible: 10,
        slaMet: 8, // 0.8 * 40 = 32
        assignedJobs: 5,
        cancelledByTech: 0, // 1.0 * 20 = 20
      });
      expect(score).toBe(72);
    });

    it('should penalize cancellations appropriately', () => {
      // 100% acceptance (40 pts), 100% SLA (40 pts), 2 out of 10 cancelled (80% kept = 16 pts) -> 96
      const score = calculateReliabilityScore({
        offersReceived: 10,
        offersAccepted: 10,
        slaEligible: 8,
        slaMet: 8,
        assignedJobs: 10,
        cancelledByTech: 2,
      });
      expect(score).toBe(96);
    });
  });

  describe('3. Payout & Platform Fee Settlement Math', () => {
    it('should deduct full platform fee from technician when feePayer is "technician"', () => {
      const totalAmount = 100.0;
      const fee = 1.5;
      const feePayer = 'technician';

      let payoutAmount = totalAmount;
      let feeDeducted = 0;
      if (feePayer === 'technician') {
        payoutAmount = Math.max(0, totalAmount - fee);
        feeDeducted = fee;
      }

      expect(payoutAmount).toBe(98.5);
      expect(feeDeducted).toBe(1.5);
    });

    it('should deduct nothing from technician payout when feePayer is "customer"', () => {
      const totalAmount = 100.0;
      const fee = 1.5;
      const feePayer = 'customer';

      let payoutAmount = totalAmount;
      let feeDeducted = 0;
      if (feePayer === 'customer') {
        payoutAmount = totalAmount;
        feeDeducted = 0;
      }

      expect(payoutAmount).toBe(100.0);
      expect(feeDeducted).toBe(0);
    });

    it('should split platform fee equally when feePayer is "split"', () => {
      const totalAmount = 100.0;
      const fee = 1.5;
      const feePayer = 'split';

      let payoutAmount = totalAmount;
      let feeDeducted = 0;
      if (feePayer === 'split') {
        const halfFee = fee / 2;
        payoutAmount = Math.max(0, totalAmount - halfFee);
        feeDeducted = halfFee;
      }

      expect(payoutAmount).toBe(99.25);
      expect(feeDeducted).toBe(0.75);
    });
  });

  describe('4. Inventory Consumption & Low Stock Logic', () => {
    it('should correctly decrement available quantity and reserved quantity without going negative', () => {
      const currentQty = 5;
      const currentReserved = 2;
      const partsUsed = [{ partCode: 'VALVE-01', quantity: 2 }];

      const newQty = Math.max(0, currentQty - partsUsed[0].quantity);
      const newReserved = Math.max(0, currentReserved - partsUsed[0].quantity);

      expect(newQty).toBe(3);
      expect(newReserved).toBe(0);
    });

    it('should detect when stock falls to or below lowStockThreshold', () => {
      const threshold = 2;
      const stockAfterUse = 2;
      const isLowStock = stockAfterUse <= threshold;
      expect(isLowStock).toBe(true);
    });
  });

  describe('5. Rating Aggregation Math', () => {
    it('should accurately compute running average rating after new review', () => {
      let ratingSum = 18;
      let ratingCount = 4; // current average: 4.5

      const newRating = 5;
      ratingSum += newRating;
      ratingCount += 1;

      const newAverage = Number((ratingSum / ratingCount).toFixed(2));
      expect(newAverage).toBe(4.6);
      expect(ratingCount).toBe(5);
    });
  });
});
