const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;
const isProd = process.env.NODE_ENV === 'production';

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['error'] : ['error', 'warn'],
  });

if (!isProd) {
  globalForPrisma.prisma = prisma;
}

async function connectPrisma() {
  await prisma.$connect();
  return prisma;
}

async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
  } catch {
    /* noop */
  }
}

module.exports = { prisma, connectPrisma, disconnectPrisma };
