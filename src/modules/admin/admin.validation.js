const { z } = require('zod');

const timeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM formatda bo‘lsin');
const slotSchema = z
  .object({ open: timeHHMM, close: timeHHMM })
  .nullable()
  .refine(
    (s) => s === null || s.open < s.close,
    { message: 'open close dan kichik bo‘lsin' },
  );

const openingHoursSchema = z.object({
  mon: slotSchema,
  tue: slotSchema,
  wed: slotSchema,
  thu: slotSchema,
  fri: slotSchema,
  sat: slotSchema,
  sun: slotSchema,
});

const clinicCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(5).max(40),
  address: z.string().trim().min(2).max(255),
  city: z.string().trim().min(2).max(80),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  openingHours: openingHoursSchema,
});

const clinicUpdateSchema = clinicCreateSchema.partial();

const idParamSchema = z.object({
  id: z.string().min(1, 'id majburiy'),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().min(1).max(120).optional(),
});

const userRoleUpdateSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

module.exports = {
  clinicCreateSchema,
  clinicUpdateSchema,
  idParamSchema,
  listQuerySchema,
  userRoleUpdateSchema,
};
