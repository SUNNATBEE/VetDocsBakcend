const bcrypt = require('bcryptjs');
const { prisma } = require('../src/infrastructure/database/prisma.client');

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@vetclinic.uz').toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'Vet Clinic Admin';
const DEMO_USER_PASSWORD = process.env.SEED_DEMO_USER_PASSWORD || 'DemoUser123!';

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

const extendedHours = {
  mon: { open: '08:00', close: '21:00' },
  tue: { open: '08:00', close: '21:00' },
  wed: { open: '08:00', close: '21:00' },
  thu: { open: '08:00', close: '21:00' },
  fri: { open: '08:00', close: '21:00' },
  sat: { open: '09:00', close: '18:00' },
  sun: { open: '10:00', close: '15:00' },
};

// Toshkent tumanlari — markaziy koordinatalar (taxminiy).
// Har bir tuman uchun 5 ta klinika ochiladi (markaz atrofida kichik ofsetlar).
const tashkentDistricts = [
  { key: 'Bektemir', name: 'Bektemir', lat: 41.226, lng: 69.339 },
  { key: 'Chilonzor', name: 'Chilonzor', lat: 41.275, lng: 69.205 },
  { key: 'Mirobod', name: 'Mirobod', lat: 41.295, lng: 69.282 },
  { key: 'Mirzo Ulug‘bek', name: 'Mirzo Ulug‘bek', lat: 41.325, lng: 69.336 },
  { key: 'Olmazor', name: 'Olmazor', lat: 41.347, lng: 69.226 },
  { key: 'Sergeli', name: 'Sergeli', lat: 41.230, lng: 69.219 },
  { key: 'Shayxontohur', name: 'Shayxontohur', lat: 41.325, lng: 69.236 },
  { key: 'Uchtepa', name: 'Uchtepa', lat: 41.288, lng: 69.184 },
  { key: 'Yakkasaroy', name: 'Yakkasaroy', lat: 41.286, lng: 69.252 },
  { key: 'Yangi Hayot', name: 'Yangi Hayot', lat: 41.196, lng: 69.255 },
  { key: 'Yashnobod', name: 'Yashnobod', lat: 41.295, lng: 69.330 },
  { key: 'Yunusobod', name: 'Yunusobod', lat: 41.367, lng: 69.291 },
];

// Klinika namuna nomlari (har bir tuman uchun 5 ta).
const clinicNamePatterns = [
  { suffix: 'Vet Service', phone: '71 200 10', hours: businessHours },
  { suffix: 'Zoo Vet Klinikasi', phone: '71 200 20', hours: businessHours },
  { suffix: 'PetCare Markazi', phone: '71 200 30', hours: extendedHours },
  { suffix: '24/7 Emergency Vet', phone: '71 200 40', hours: round247 },
  { suffix: 'Hayvonlar Shifoxonasi', phone: '71 200 50', hours: businessHours },
];

// Markaz atrofida 5 ta klinikani teng taqsimlash uchun ofsetlar (~0.5–1 km).
const clinicOffsets = [
  { dLat: 0.000, dLng: 0.000 },
  { dLat: 0.006, dLng: 0.004 },
  { dLat: -0.005, dLng: 0.006 },
  { dLat: 0.004, dLng: -0.007 },
  { dLat: -0.007, dLng: -0.004 },
];

function buildTashkentClinics() {
  const list = [];
  tashkentDistricts.forEach((district, dIdx) => {
    clinicNamePatterns.forEach((pattern, cIdx) => {
      const offset = clinicOffsets[cIdx];
      const phoneSeq = String(dIdx * 5 + cIdx + 1).padStart(2, '0');
      list.push({
        name: `${pattern.suffix} — ${district.name}`,
        phone: `+998 ${pattern.phone} ${phoneSeq}`,
        address: `${district.name} tumani, ko‘cha ${cIdx + 1}-uy, Toshkent`,
        city: 'Toshkent',
        district: district.key,
        latitude: Number((district.lat + offset.dLat).toFixed(6)),
        longitude: Number((district.lng + offset.dLng).toFixed(6)),
        openingHours: pattern.hours,
      });
    });
  });
  return list;
}

const tashkentClinics = buildTashkentClinics();

const otherCityClinics = [
  {
    name: 'Samarqand Vet Markazi',
    phone: '+998 66 222 33 44',
    address: 'Registon yo‘nalishi, Samarqand',
    city: 'Samarqand',
    district: null,
    latitude: 39.6542,
    longitude: 66.9597,
    openingHours: businessHours,
  },
  {
    name: 'Fargona Pet Care Center',
    phone: '+998 73 244 77 88',
    address: 'Al-Farg\'oniy ko\'chasi, Farg\'ona',
    city: 'Farg\'ona',
    district: null,
    latitude: 40.3894,
    longitude: 71.7875,
    openingHours: {
      mon: { open: '08:30', close: '18:30' },
      tue: { open: '08:30', close: '18:30' },
      wed: { open: '08:30', close: '18:30' },
      thu: { open: '08:30', close: '18:30' },
      fri: { open: '08:30', close: '18:30' },
      sat: { open: '09:00', close: '15:00' },
      sun: null,
    },
  },
];

const clinics = [...tashkentClinics, ...otherCityClinics];

const demoUsers = [
  { email: 'ali.demo@vetclinic.uz', name: 'Ali Karimov' },
  { email: 'dilnoza.demo@vetclinic.uz', name: 'Dilnoza Raximova' },
  { email: 'jamshid.demo@vetclinic.uz', name: 'Jamshid Tursunov' },
  { email: 'malika.demo@vetclinic.uz', name: 'Malika Yoqubova' },
  { email: 'sardor.demo@vetclinic.uz', name: 'Sardor Ismoilov' },
];

const demoReviewComments = [
  { rating: 5, comment: 'Veterinarlar juda e\'tiborli, xizmat zo\'r.' },
  { rating: 4, comment: 'Navbat biroz bo\'ldi, lekin davolash yaxshi.' },
  { rating: 5, comment: 'Toza joy, xodimlar muloyim, tavsiya qilaman.' },
  { rating: 4, comment: 'Mushugimni tez ko\'rikdan o\'tkazishdi.' },
  { rating: 5, comment: 'Tunda ham ishlaydi, shoshilinch holatda yordam berdi.' },
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

// Demo sharhlar — har bir demo user 24/7 Emergency Vet va PetCare Markazi
// klinikalariga (Chilonzor + Yunusobod) bittadan sharh qoldiradi.
async function seedDemoUsersAndReviews() {
  const demoPasswordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: 'USER' },
      create: {
        email: user.email,
        name: user.name,
        passwordHash: demoPasswordHash,
        role: 'USER',
      },
    });
  }

  const reviewTargets = [
    '24/7 Emergency Vet — Chilonzor',
    'PetCare Markazi — Yunusobod',
  ];
  const clinicRows = await prisma.clinic.findMany({
    where: { name: { in: reviewTargets } },
    select: { id: true, name: true },
  });
  const userRows = await prisma.user.findMany({
    where: { email: { in: demoUsers.map((user) => user.email) } },
    select: { id: true, email: true },
  });

  const reviewsToCreate = [];
  for (const clinic of clinicRows) {
    userRows.forEach((user, idx) => {
      const tpl = demoReviewComments[idx % demoReviewComments.length];
      reviewsToCreate.push({
        clinicId: clinic.id,
        userId: user.id,
        rating: tpl.rating,
        comment: tpl.comment,
      });
    });
  }

  await prisma.review.createMany({ data: reviewsToCreate });

  return {
    userCount: demoUsers.length,
    reviewCount: reviewsToCreate.length,
  };
}

async function main() {
  await seedClinics();
  const admin = await seedAdmin();
  const demo = await seedDemoUsersAndReviews();

  // eslint-disable-next-line no-console
  console.log(`[seed] ${clinics.length} klinika yaratildi (${tashkentClinics.length} ta Toshkent, ${otherCityClinics.length} ta boshqa shahar)`);
  // eslint-disable-next-line no-console
  console.log(`[seed] ${demo.userCount} demo foydalanuvchi va ${demo.reviewCount} demo sharh yaratildi`);
  // eslint-disable-next-line no-console
  console.log(`[seed] Admin: ${admin.email} | parol: ${ADMIN_PASSWORD}`);
  // eslint-disable-next-line no-console
  console.log(`[seed] Demo user paroli: ${DEMO_USER_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error('[seed] xato:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
