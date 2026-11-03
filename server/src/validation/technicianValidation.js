const { z } = require('zod');

const updateProfileSchema = z.object({
  serviceCategories: z
    .array(z.enum(['plumbing', 'hvac', 'delivery']))
    .min(1, 'Select at least one service category')
    .optional(),
  skills: z.array(z.string()).optional(),
  qualifications: z.array(z.string()).optional(),
  experienceYears: z.number().min(0).max(60).optional(),
  serviceArea: z
    .object({
      center: z.object({
        type: z.literal('Point').default('Point'),
        coordinates: z
          .tuple([z.number(), z.number()])
          .transform(([lng, lat]) => [
            Number((((lng + 180) % 360 + 360) % 360 - 180).toFixed(6)),
            Number(Math.max(-90, Math.min(90, lat)).toFixed(6)),
          ]),
      }),
      radiusKm: z.number().min(1).max(150),
    })
    .optional(),
  vehicleType: z.enum(['car', 'van', 'motorcycle', 'pickup', 'bicycle', 'none']).optional(),
  packageCapacityKg: z.number().min(0).optional(),
  workingHours: z
    .object({
      start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
      end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)'),
      days: z.array(z.string()),
    })
    .optional(),
});

const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const inventoryItemSchema = z
  .object({
    name: z.string().min(1, 'Part name is required').max(120),
    category: z.enum(['Plumbing', 'HVAC', 'Urgent Delivery', 'General']),
    partCode: z.string().min(1, 'Part code is required').max(40),
    quantity: z.number().min(0, 'Quantity cannot be negative'),
    reservedQuantity: z.number().min(0, 'Reserved quantity cannot be negative').default(0),
    unit: z.string().default('pcs'),
    unitCost: z.number().min(0, 'Unit cost cannot be negative').default(0),
    lowStockThreshold: z.number().min(0).default(5),
  })
  .refine((data) => data.reservedQuantity <= data.quantity, {
    message: 'Reserved quantity cannot exceed total stock quantity',
    path: ['reservedQuantity'],
  });

const verifyTechnicianSchema = z
  .object({
    action: z.enum(['approved', 'rejected']),
    rejectionReason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'rejected') {
        return Boolean(data.rejectionReason && data.rejectionReason.trim().length > 0);
      }
      return true;
    },
    {
      message: 'Rejection reason is required when rejecting a technician',
      path: ['rejectionReason'],
    }
  );

const updateJobStatusSchema = z.object({
  status: z.enum(['en_route', 'arrived', 'in_progress']),
  note: z.string().max(500).optional(),
});

module.exports = {
  updateProfileSchema,
  toggleAvailabilitySchema,
  updateLocationSchema,
  inventoryItemSchema,
  verifyTechnicianSchema,
  updateJobStatusSchema,
};
