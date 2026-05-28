import { PrismaClient, UserRole, PractitionerType, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = 'Password123!';

async function main() {
  console.log('Seeding login accounts (non-destructive upsert)...');
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // --- Admin ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ndipaano.co.zm' },
    update: { passwordHash, isActive: true, isEmailVerified: true, isPhoneVerified: true },
    create: {
      email: 'admin@ndipaano.co.zm',
      phone: '+260970000001',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Ndipaano',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
  });
  console.log('  admin@ndipaano.co.zm');

  // --- Patients ---
  const patient1 = await prisma.user.upsert({
    where: { email: 'chanda.mwamba@gmail.com' },
    update: { passwordHash, isActive: true, isEmailVerified: true, isPhoneVerified: true },
    create: {
      email: 'chanda.mwamba@gmail.com',
      phone: '+260971234567',
      passwordHash,
      firstName: 'Chanda',
      lastName: 'Mwamba',
      role: UserRole.PATIENT,
      languagePreference: 'en',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
  });
  await prisma.patientProfile.upsert({
    where: { userId: patient1.id },
    update: {},
    create: {
      userId: patient1.id,
      memberId: 'NDP-PAT-2024-0001',
      dateOfBirth: new Date('1990-05-15'),
      gender: Gender.FEMALE,
      bloodType: 'O_POSITIVE',
      emergencyContactName: 'Bwalya Mwamba',
      emergencyContactPhone: '+260972345678',
      nhimaNumber: 'NHIMA-2024-001234',
      address: '123 Cairo Road',
      city: 'Lusaka',
      province: 'Lusaka',
    },
  });
  console.log('  chanda.mwamba@gmail.com');

  const patient2 = await prisma.user.upsert({
    where: { email: 'mutale.banda@gmail.com' },
    update: { passwordHash, isActive: true, isEmailVerified: true, isPhoneVerified: true },
    create: {
      email: 'mutale.banda@gmail.com',
      phone: '+260973456789',
      passwordHash,
      firstName: 'Mutale',
      lastName: 'Banda',
      role: UserRole.PATIENT,
      languagePreference: 'bem',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
  });
  await prisma.patientProfile.upsert({
    where: { userId: patient2.id },
    update: {},
    create: {
      userId: patient2.id,
      memberId: 'NDP-PAT-2024-0002',
      dateOfBirth: new Date('1985-08-22'),
      gender: Gender.MALE,
      bloodType: 'A_POSITIVE',
      emergencyContactName: 'Grace Banda',
      emergencyContactPhone: '+260974567890',
      address: '45 Great East Road',
      city: 'Lusaka',
      province: 'Lusaka',
    },
  });
  console.log('  mutale.banda@gmail.com');

  // --- Practitioners ---
  const doctor1 = await prisma.user.upsert({
    where: { email: 'dr.tembo@ndipaano.co.zm' },
    update: { passwordHash, isActive: true, isEmailVerified: true, isPhoneVerified: true },
    create: {
      email: 'dr.tembo@ndipaano.co.zm',
      phone: '+260975678901',
      passwordHash,
      firstName: 'Dr. Joseph',
      lastName: 'Tembo',
      role: UserRole.DOCTOR,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
  });
  await prisma.practitionerProfile.upsert({
    where: { userId: doctor1.id },
    update: {},
    create: {
      userId: doctor1.id,
      practitionerType: PractitionerType.GENERAL_PRACTITIONER,
      hpczRegistrationNumber: 'HPCZ-DOC-2024-0001',
      hpczCertificateExpiry: new Date('2026-12-31'),
      hpczVerified: true,
      specializations: ['General Practice', 'Internal Medicine'],
      bio: 'Experienced general practitioner with 15 years of service in Lusaka.',
      serviceRadiusKm: 30,
      baseConsultationFee: 350.0,
      isAvailable: true,
      ratingAvg: 4.8,
      ratingCount: 127,
      latitude: -15.4167,
      longitude: 28.2833,
      offersHomeVisits: true,
      offersClinicVisits: true,
    },
  });
  console.log('  dr.tembo@ndipaano.co.zm');

  const nurse1 = await prisma.user.upsert({
    where: { email: 'nurse.phiri@ndipaano.co.zm' },
    update: { passwordHash, isActive: true, isEmailVerified: true, isPhoneVerified: true },
    create: {
      email: 'nurse.phiri@ndipaano.co.zm',
      phone: '+260976789012',
      passwordHash,
      firstName: 'Mercy',
      lastName: 'Phiri',
      role: UserRole.NURSE,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
  });
  await prisma.practitionerProfile.upsert({
    where: { userId: nurse1.id },
    update: {},
    create: {
      userId: nurse1.id,
      practitionerType: PractitionerType.REGISTERED_NURSE,
      hpczRegistrationNumber: 'HPCZ-NUR-2024-0042',
      hpczCertificateExpiry: new Date('2025-06-30'),
      hpczVerified: true,
      specializations: ['Pediatric Care', 'Wound Care', 'Vaccinations'],
      bio: 'Registered nurse specializing in pediatric and home-based nursing care.',
      serviceRadiusKm: 20,
      baseConsultationFee: 200.0,
      isAvailable: true,
      ratingAvg: 4.9,
      ratingCount: 89,
      latitude: -15.3875,
      longitude: 28.3228,
      offersHomeVisits: true,
      offersClinicVisits: true,
    },
  });
  console.log('  nurse.phiri@ndipaano.co.zm');

  const physio1 = await prisma.user.upsert({
    where: { email: 'physio.lungu@ndipaano.co.zm' },
    update: { passwordHash, isActive: true, isEmailVerified: true, isPhoneVerified: true },
    create: {
      email: 'physio.lungu@ndipaano.co.zm',
      phone: '+260977890123',
      passwordHash,
      firstName: 'Emmanuel',
      lastName: 'Lungu',
      role: UserRole.PHYSIOTHERAPIST,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
  });
  await prisma.practitionerProfile.upsert({
    where: { userId: physio1.id },
    update: {},
    create: {
      userId: physio1.id,
      practitionerType: PractitionerType.PHYSIOTHERAPIST,
      hpczRegistrationNumber: 'HPCZ-PHY-2024-0015',
      hpczCertificateExpiry: new Date('2025-09-30'),
      hpczVerified: true,
      specializations: ['Sports Rehabilitation', 'Post-Surgery Recovery', 'Elderly Care'],
      bio: 'Licensed physiotherapist offering home-based rehabilitation services.',
      serviceRadiusKm: 25,
      baseConsultationFee: 300.0,
      isAvailable: false,
      ratingAvg: 4.6,
      ratingCount: 45,
      latitude: -15.4,
      longitude: 28.31,
    },
  });
  console.log('  physio.lungu@ndipaano.co.zm');

  const unverifiedDoc = await prisma.user.upsert({
    where: { email: 'dr.pending@ndipaano.co.zm' },
    update: { passwordHash, isActive: true, isEmailVerified: true },
    create: {
      email: 'dr.pending@ndipaano.co.zm',
      phone: '+260978901234',
      passwordHash,
      firstName: 'Dr. Sarah',
      lastName: 'Nakamba',
      role: UserRole.DOCTOR,
      isEmailVerified: true,
      isPhoneVerified: false,
      isActive: true,
    },
  });
  await prisma.practitionerProfile.upsert({
    where: { userId: unverifiedDoc.id },
    update: {},
    create: {
      userId: unverifiedDoc.id,
      practitionerType: PractitionerType.SPECIALIST_DOCTOR,
      hpczRegistrationNumber: 'HPCZ-DOC-2024-0099',
      hpczCertificateExpiry: new Date('2026-03-31'),
      hpczVerified: false,
      specializations: ['Family Medicine'],
      bio: 'Family medicine practitioner seeking to provide home care services.',
      serviceRadiusKm: 15,
      baseConsultationFee: 400.0,
      isAvailable: false,
      ratingAvg: 0,
      ratingCount: 0,
      latitude: -15.43,
      longitude: 28.27,
    },
  });
  console.log('  dr.pending@ndipaano.co.zm');

  console.log('\nDone. Password for all accounts: Password123!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
