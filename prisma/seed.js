const bcrypt = require('bcryptjs');
const { prisma } = require('../src/infrastructure/database/prisma.client');

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@vetclinic.uz').toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Vet Clinic Admin';

const businessHours = {
  mon: { open: '09:00', close: '19:00' },
  tue: { open: '09:00', close: '19:00' },
  wed: { open: '09:00', close: '19:00' },
  thu: { open: '09:00', close: '19:00' },
  fri: { open: '09:00', close: '19:00' },
  sat: { open: '10:00', close: '16:00' },
  sun: null,
};

const round247 = {
  mon: { open: '00:00', close: '23:59' },
  tue: { open: '00:00', close: '23:59' },
  wed: { open: '00:00', close: '23:59' },
  thu: { open: '00:00', close: '23:59' },
  fri: { open: '00:00', close: '23:59' },
  sat: { open: '00:00', close: '23:59' },
  sun: { open: '00:00', close: '23:59' },
};

const clinics = [
  {
    name: 'Vet Service Chilonzor',
    phone: '+998 71 123 45 67',
    address: 'Chilonzor-9, Toshkent',
    city: 'Toshkent',
    latitude: 41.285,
    longitude: 69.204,
    openingHours: businessHours,
  },
  {
    name: 'Zoo Vet Klinikasi Yunusobod',
    phone: '+998 71 234 56 78',
    address: 'Amir Temur ko‘chasi yaqin, Yunusobod',
    city: 'Toshkent',
    latitude: 41.365,
    longitude: 69.292,
    openingHours: businessHours,
  },
  {
    name: '24/7 Emergency Vet',
    phone: '+998 90 555 12 34',
    address: 'Shayxontohur tumani, Toshkent',
    city: 'Toshkent',
    latitude: 41.315,
    longitude: 69.248,
    openingHours: round247,
  },
  {
    name: 'Samarqand Vet Markazi',
    phone: '+998 66 222 33 44',
    address: 'Registon yo‘nalishi, Samarqand',
    city: 'Samarqand',
    latitude: 39.6542,
    longitude: 66.9597,
    openingHours: businessHours,
  },
];

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'ADMIN' },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash,
      role: 'ADMIN',
    },
  });
}

async function seedClinics() {
  await prisma.review.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.clinic.createMany({ data: clinics });
}

async function main() {
  await seedClinics();
  const admin = await seedAdmin();

  // eslint-disable-next-line no-console
  console.log(`[seed] ${clinics.length} klinika yaratildi`);
  // eslint-disable-next-line no-console
  console.log(`[seed] Admin: ${admin.email} | parol: ${ADMIN_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error('[seed] xato:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
