const { z } = require('zod');

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
  radiusKm: z.coerce.number().finite().positive().max(200).optional().default(10),
});

const clinicIdParamsSchema = z.object({
  id: z.string().min(1, 'id majburiy'),
});

const reviewBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

module.exports = {
  nearbyQuerySchema,
  clinicIdParamsSchema,
  reviewBodySchema,
};
