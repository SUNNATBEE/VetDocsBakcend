const { z } = require('zod');
const { emptyToUndefined } = require('../../common/utils/geocode');
const { TASHKENT_DISTRICT_KEYS } = require('./clinic.constants');

const nearbyQuerySchema = z
  .object({
    lat: z.preprocess(
      emptyToUndefined,
      z.coerce.number().finite().min(-90).max(90).optional(),
    ),
    lng: z.preprocess(
      emptyToUndefined,
      z.coerce.number().finite().min(-180).max(180).optional(),
    ),
    address: z.preprocess((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      const s = String(v).trim();
      return s === '' ? undefined : s;
    }, z.string().max(500).optional()),
    radiusKm: z.preprocess(
      emptyToUndefined,
      z.coerce.number().finite().positive().max(200).optional().default(10),
    ),
    district: z.preprocess((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      const s = String(v).trim();
      return s === '' ? undefined : s;
    }, z.enum(TASHKENT_DISTRICT_KEYS).optional()),
  })
  .superRefine((data, ctx) => {
    const addr = data.address;
    const hasLat = data.lat !== undefined;
    const hasLng = data.lng !== undefined;
    const hasDistrict = data.district !== undefined;

    if (addr) {
      if (addr.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "address kamida 3 belgi bo'lishi kerak",
          path: ['address'],
        });
        return;
      }
      if (hasLat || hasLng) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "address yoki lat/lng — faqat bittasini yuboring",
          path: ['address'],
        });
      }
      return;
    }

    // district berilgan bo'lsa, lat/lng ixtiyoriy — markaz tuman markazidan olinadi.
    if (hasDistrict) return;

    if (!hasLat || !hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lat va lng majburiy (yoki address yoki district)",
        path: ['lat'],
      });
    }
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
