const { z } = require('zod');

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email noto‘g‘ri formatda');

const registerSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, 'Parol kamida 8 belgi')
    .max(128, 'Parol 128 belgidan oshmasin'),
  name: z.string().trim().min(1).max(120).optional(),
});

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Parol bo‘sh bo‘lmasin').max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20, 'Refresh token noto‘g‘ri'),
});

const logoutSchema = z
  .object({
    refreshToken: z.string().min(20).optional(),
  })
  .partial()
  .optional()
  .default({});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
};
