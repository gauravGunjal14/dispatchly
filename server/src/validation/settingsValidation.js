const { z } = require('zod');

const slaWindowSchema = z.object({
  responseMinutes: z.number().min(1),
  arrivalMinutes: z.number().min(1),
  completionMinutes: z.number().min(1),
});

const categorySlaSchema = z.object({
  normal: slaWindowSchema,
  urgent: slaWindowSchema,
});

const updateSettingsSchema = z
  .object({
    platformFeePerTicket: z.number().min(0).optional(),
    currency: z.string().min(3).max(3).optional(),
    offerExpirySeconds: z.number().min(15).max(300).optional(),
    maxOfferAttempts: z.number().min(1).max(20).optional(),
    maxCandidateRadiusKm: z.number().min(1).max(200).optional(),
    locationStaleMinutes: z.number().min(1).max(120).optional(),
    sweeperIntervalSeconds: z.number().min(2).max(60).optional(),
    workloadMaxActiveJobs: z.number().min(1).max(10).optional(),
    avgSpeedKmh: z.number().min(5).max(120).optional(),
    dispatchWeights: z
      .object({
        sla: z.number().min(0).max(100),
        location: z.number().min(0).max(100),
        skills: z.number().min(0).max(100),
        workload: z.number().min(0).max(100),
        inventory: z.number().min(0).max(100),
        reliability: z.number().min(0).max(100),
      })
      .optional(),
    slaTargets: z
      .object({
        plumbing: categorySlaSchema.optional(),
        hvac: categorySlaSchema.optional(),
        delivery: categorySlaSchema.optional(),
      })
      .optional(),
    pricingConfig: z
      .object({
        urgentSurchargePercentage: z.number().min(0).max(100).optional(),
        deliveryPricePerKm: z.number().min(0).optional(),
      })
      .optional(),
    slaMonitoring: z
      .object({
        atRiskThresholdPercent: z.number().min(50).max(95).optional(),
        sweeperIntervalSeconds: z.number().min(5).max(300).optional(),
      })
      .optional(),
    feePayer: z.enum(['technician', 'customer', 'split']).optional(),
    autoVerificationHours: z.number().min(1).max(168).optional(),
    cancellationPolicy: z.enum(['free_before_start', 'fee_after_quote_reject']).optional(),
  })
  .refine(
    (data) => {
      if (data.dispatchWeights) {
        const { sla, location, skills, workload, inventory, reliability } = data.dispatchWeights;
        const sum = sla + location + skills + workload + inventory + reliability;
        return sum === 100;
      }
      return true;
    },
    {
      message: 'Dispatch scoring weights must sum to exactly 100',
      path: ['dispatchWeights'],
    }
  );

module.exports = {
  updateSettingsSchema,
};
