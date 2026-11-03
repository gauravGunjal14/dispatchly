const { z } = require('zod');

const geoPointSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z
    .tuple([
      z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
      z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
    ]),
  address: z.string().max(250).optional().default(''),
  landmark: z.string().max(100).optional().default(''),
});

const estimateBookingSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  priority: z.enum(['normal', 'urgent']).default('normal'),
  pickupLocation: geoPointSchema.optional(),
  dropoffLocation: geoPointSchema.optional(),
});

const createBookingSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  description: z.string().min(5, 'Description must be at least 5 characters').max(2000),
  priority: z.enum(['normal', 'urgent']).default('normal'),
  contactPhone: z.string().min(5, 'Valid contact phone number is required').max(30),
  location: geoPointSchema,
  pickupLocation: geoPointSchema.optional(),
  dropoffLocation: geoPointSchema.optional(),
  packageWeightKg: z.number().min(0).max(5000).optional(),
  packageDescription: z.string().max(500).optional(),
  deliveryDeadline: z.string().datetime().optional(),
  idempotencyKey: z.string().min(5, 'Idempotency key is required'),
});

const cancelBookingSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason is required').max(500),
});

module.exports = {
  geoPointSchema,
  estimateBookingSchema,
  createBookingSchema,
  cancelBookingSchema,
};
