const { z } = require('zod');

const serviceCatalogSchema = z.object({
  category: z.enum(['plumbing', 'hvac', 'delivery']),
  name: z.string().min(2, 'Service name must be at least 2 characters').max(120),
  code: z.string().min(2, 'Service code is required').max(50),
  description: z.string().min(5, 'Description must be at least 5 characters').max(1000),
  pricingType: z.enum(['fixed', 'range', 'quotation']),
  basePrice: z.number().min(0).default(0),
  minPrice: z.number().min(0).default(0),
  maxPrice: z.number().min(0).default(0),
  estimatedDurationMin: z.number().min(5).default(60),
  isActive: z.boolean().default(true),
  requirements: z
    .object({
      requiredSkills: z.array(z.string()).default([]),
      requiredParts: z
        .array(
          z.object({
            partCode: z.string().min(1),
            name: z.string().min(1),
            quantity: z.number().min(1).default(1),
          })
        )
        .default([]),
      allowedVehicleTypes: z
        .array(z.enum(['motorcycle', 'car', 'van', 'pickup', 'bicycle', 'none']))
        .default([]),
      minPackageCapacityKg: z.number().min(0).default(0),
    })
    .default({}),
});

const updateServiceSchema = serviceCatalogSchema.partial();

module.exports = {
  serviceCatalogSchema,
  updateServiceSchema,
};
