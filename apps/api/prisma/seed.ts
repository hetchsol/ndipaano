import { PrismaClient, UserRole, PractitionerType, Gender, ServiceType, BookingStatus, PaymentStatus, PaymentMethod, ConsentType, DocumentType, NotificationChannel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.consentRecord.deleteMany();
  await prisma.review.deleteMany();
  await prisma.insuranceClaim.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.bookingTracking.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.practitionerDocument.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.practitionerProfile.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.dataSubjectRequest.deleteMany();
  await prisma.pharmacy.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data.');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // --- Admin User ---
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ndiipano.co.zm',
      phone: '+260970000001',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Ndiipano',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
  });
  console.log('Created admin user:', admin.email);

  // --- Patient Users ---
  const patient1 = await prisma.user.create({
    data: {
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
      patientProfile: {
        create: {
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
      },
    },
  });

  const patient2 = await prisma.user.create({
    data: {
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
      patientProfile: {
        create: {
          dateOfBirth: new Date('1985-08-22'),
          gender: Gender.MALE,
          bloodType: 'A_POSITIVE',
          emergencyContactName: 'Grace Banda',
          emergencyContactPhone: '+260974567890',
          address: '45 Great East Road',
          city: 'Lusaka',
          province: 'Lusaka',
        },
      },
    },
  });

  console.log('Created patient users:', patient1.email, patient2.email);

  // --- Practitioner Users ---
  const doctor1 = await prisma.user.create({
    data: {
      email: 'dr.tembo@ndiipano.co.zm',
      phone: '+260975678901',
      passwordHash,
      firstName: 'Dr. Joseph',
      lastName: 'Tembo',
      role: UserRole.DOCTOR,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      practitionerProfile: {
        create: {
          practitionerType: PractitionerType.GENERAL_PRACTITIONER,
          hpczRegistrationNumber: 'HPCZ-DOC-2024-0001',
          hpczCertificateExpiry: new Date('2026-12-31'),
          hpczVerified: true,
          specializations: ['General Practice', 'Internal Medicine'],
          bio: 'Experienced general practitioner with 15 years of service in Lusaka. Passionate about community healthcare and home-based medical services.',
          serviceRadiusKm: 30,
          baseConsultationFee: 350.00,
          isAvailable: true,
          ratingAvg: 4.8,
          ratingCount: 127,
          latitude: -15.4167,
          longitude: 28.2833,
        },
      },
    },
  });

  const nurse1 = await prisma.user.create({
    data: {
      email: 'nurse.phiri@ndiipano.co.zm',
      phone: '+260976789012',
      passwordHash,
      firstName: 'Mercy',
      lastName: 'Phiri',
      role: UserRole.NURSE,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      practitionerProfile: {
        create: {
          practitionerType: PractitionerType.REGISTERED_NURSE,
          hpczRegistrationNumber: 'HPCZ-NUR-2024-0042',
          hpczCertificateExpiry: new Date('2025-06-30'),
          hpczVerified: true,
          specializations: ['Pediatric Care', 'Wound Care', 'Vaccinations'],
          bio: 'Registered nurse specializing in pediatric and home-based nursing care. Available for routine checkups, wound dressing, and vaccinations.',
          serviceRadiusKm: 20,
          baseConsultationFee: 200.00,
          isAvailable: true,
          ratingAvg: 4.9,
          ratingCount: 89,
          latitude: -15.3875,
          longitude: 28.3228,
        },
      },
    },
  });

  const physio1 = await prisma.user.create({
    data: {
      email: 'physio.lungu@ndiipano.co.zm',
      phone: '+260977890123',
      passwordHash,
      firstName: 'Emmanuel',
      lastName: 'Lungu',
      role: UserRole.PHYSIOTHERAPIST,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      practitionerProfile: {
        create: {
          practitionerType: PractitionerType.PHYSIOTHERAPIST,
          hpczRegistrationNumber: 'HPCZ-PHY-2024-0015',
          hpczCertificateExpiry: new Date('2025-09-30'),
          hpczVerified: true,
          specializations: ['Sports Rehabilitation', 'Post-Surgery Recovery', 'Elderly Care'],
          bio: 'Licensed physiotherapist offering home-based rehabilitation services. Specializing in sports injuries and post-surgical recovery.',
          serviceRadiusKm: 25,
          baseConsultationFee: 300.00,
          isAvailable: false,
          ratingAvg: 4.6,
          ratingCount: 45,
          latitude: -15.4000,
          longitude: 28.3100,
        },
      },
    },
  });

  const unverifiedDoc = await prisma.user.create({
    data: {
      email: 'dr.pending@ndiipano.co.zm',
      phone: '+260978901234',
      passwordHash,
      firstName: 'Dr. Sarah',
      lastName: 'Nakamba',
      role: UserRole.DOCTOR,
      isEmailVerified: true,
      isPhoneVerified: false,
      isActive: true,
      practitionerProfile: {
        create: {
          practitionerType: PractitionerType.SPECIALIST_DOCTOR,
          hpczRegistrationNumber: 'HPCZ-DOC-2024-0099',
          hpczCertificateExpiry: new Date('2026-03-31'),
          hpczVerified: false,
          specializations: ['Family Medicine'],
          bio: 'Family medicine practitioner seeking to provide home care services.',
          serviceRadiusKm: 15,
          baseConsultationFee: 400.00,
          isAvailable: false,
          ratingAvg: 0,
          ratingCount: 0,
          latitude: -15.4300,
          longitude: 28.2700,
        },
      },
    },
  });

  console.log('Created practitioner users');

  // --- Practitioner Documents ---
  const doctorProfile = await prisma.practitionerProfile.findUnique({
    where: { userId: doctor1.id },
  });

  const unverifiedProfile = await prisma.practitionerProfile.findUnique({
    where: { userId: unverifiedDoc.id },
  });

  if (doctorProfile) {
    await prisma.practitionerDocument.createMany({
      data: [
        {
          practitionerId: doctorProfile.id,
          documentType: DocumentType.HPCZ_CERTIFICATE,
          fileName: 'hpcz_certificate_tembo.pdf',
          fileUrl: '/documents/hpcz_certificate_tembo.pdf',
          fileSize: 245000,
          mimeType: 'application/pdf',
          verified: true,
          verifiedBy: admin.id,
          verifiedAt: new Date('2024-01-15'),
          expiryDate: new Date('2026-12-31'),
        },
        {
          practitionerId: doctorProfile.id,
          documentType: DocumentType.NATIONAL_ID,
          fileName: 'national_id_tembo.pdf',
          fileUrl: '/documents/national_id_tembo.pdf',
          fileSize: 180000,
          mimeType: 'application/pdf',
          verified: true,
          verifiedBy: admin.id,
          verifiedAt: new Date('2024-01-15'),
        },
      ],
    });
  }

  if (unverifiedProfile) {
    await prisma.practitionerDocument.create({
      data: {
        practitionerId: unverifiedProfile.id,
        documentType: DocumentType.HPCZ_CERTIFICATE,
        fileName: 'hpcz_certificate_nakamba.pdf',
        fileUrl: '/documents/hpcz_certificate_nakamba.pdf',
        fileSize: 310000,
        mimeType: 'application/pdf',
        verified: false,
        expiryDate: new Date('2026-03-31'),
      },
    });
  }

  console.log('Created practitioner documents');

  // --- Pharmacies ---
  const pharmacy1 = await prisma.pharmacy.create({
    data: {
      name: 'Link Pharmacy - Cairo Road',
      zamraRegistration: 'ZAMRA-PH-2024-0001',
      address: '100 Cairo Road, Lusaka',
      city: 'Lusaka',
      province: 'Lusaka',
      latitude: -15.4167,
      longitude: 28.2833,
      phone: '+260211234567',
      email: 'cairoroad@linkpharmacy.co.zm',
      isActive: true,
    },
  });

  const pharmacy2 = await prisma.pharmacy.create({
    data: {
      name: 'Health Point Pharmacy',
      zamraRegistration: 'ZAMRA-PH-2024-0015',
      address: '22 Addis Ababa Drive, Lusaka',
      city: 'Lusaka',
      province: 'Lusaka',
      latitude: -15.3950,
      longitude: 28.3150,
      phone: '+260211345678',
      email: 'info@healthpointpharmacy.co.zm',
      isActive: true,
    },
  });

  console.log('Created pharmacies');

  // --- Bookings ---
  const patientProfile1 = await prisma.patientProfile.findUnique({
    where: { userId: patient1.id },
  });

  const completedBooking = await prisma.booking.create({
    data: {
      patientId: patient1.id,
      practitionerId: doctor1.id,
      serviceType: ServiceType.GENERAL_CONSULTATION,
      status: BookingStatus.COMPLETED,
      scheduledAt: new Date('2024-11-20T09:00:00Z'),
      startedAt: new Date('2024-11-20T09:15:00Z'),
      completedAt: new Date('2024-11-20T10:00:00Z'),
      locationLat: -15.4167,
      locationLng: 28.2833,
      address: '123 Cairo Road, Lusaka',
      city: 'Lusaka',
      province: 'Lusaka',
      notes: 'Routine checkup and blood pressure monitoring',
    },
  });

  const upcomingBooking = await prisma.booking.create({
    data: {
      patientId: patient1.id,
      practitionerId: nurse1.id,
      serviceType: ServiceType.CHILD_WELLNESS,
      status: BookingStatus.CONFIRMED,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      locationLat: -15.4167,
      locationLng: 28.2833,
      address: '123 Cairo Road, Lusaka',
      city: 'Lusaka',
      province: 'Lusaka',
      notes: 'Vaccination for child',
    },
  });

  const virtualBooking = await prisma.booking.create({
    data: {
      patientId: patient2.id,
      practitionerId: doctor1.id,
      serviceType: ServiceType.CHRONIC_DISEASE_MANAGEMENT,
      status: BookingStatus.COMPLETED,
      scheduledAt: new Date('2024-11-18T14:00:00Z'),
      startedAt: new Date('2024-11-18T14:05:00Z'),
      completedAt: new Date('2024-11-18T14:30:00Z'),
      notes: 'Follow-up consultation for chronic condition',
    },
  });

  const pendingBooking = await prisma.booking.create({
    data: {
      patientId: patient2.id,
      practitionerId: physio1.id,
      serviceType: ServiceType.PHYSIOTHERAPY,
      status: BookingStatus.PENDING,
      scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      locationLat: -15.3900,
      locationLng: 28.3000,
      address: '45 Great East Road, Lusaka',
      city: 'Lusaka',
      province: 'Lusaka',
      notes: 'Physiotherapy session for knee rehabilitation',
    },
  });

  console.log('Created bookings');

  // --- Medical Records ---
  const record1 = await prisma.medicalRecord.create({
    data: {
      patientId: patient1.id,
      practitionerId: doctor1.id,
      bookingId: completedBooking.id,
      diagnosis: 'Mild hypertension - Stage 1',
      treatmentNotes: 'Blood pressure 145/92. Advised lifestyle modifications: reduced salt intake, regular exercise, weight management. Follow-up in 4 weeks.',
      vitalsJson: {
        bloodPressure: '145/92',
        heartRate: 78,
        temperature: 36.6,
        weight: 72,
        height: 165,
        oxygenSaturation: 98,
      },
    },
  });

  const record2 = await prisma.medicalRecord.create({
    data: {
      patientId: patient2.id,
      practitionerId: doctor1.id,
      bookingId: virtualBooking.id,
      diagnosis: 'Type 2 Diabetes - well controlled',
      treatmentNotes: 'HbA1c at 6.8%. Current medication regime effective. Continue with Metformin 500mg BD. Next HbA1c in 3 months.',
      vitalsJson: {
        bloodGlucose: 6.2,
        bloodPressure: '128/82',
        heartRate: 72,
        weight: 85,
      },
    },
  });

  console.log('Created medical records');

  // --- Prescriptions ---
  await prisma.prescription.create({
    data: {
      medicalRecordId: record2.id,
      patientId: patient2.id,
      practitionerId: doctor1.id,
      medicationName: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily (morning and evening)',
      duration: '3 months',
      quantity: 180,
      isControlledSubstance: false,
      dispensed: true,
      pharmacyId: pharmacy1.id,
      dispensedAt: new Date('2024-11-18T15:00:00Z'),
      notes: 'Take with meals. Monitor blood glucose regularly.',
    },
  });

  await prisma.prescription.create({
    data: {
      medicalRecordId: record1.id,
      patientId: patient1.id,
      practitionerId: doctor1.id,
      medicationName: 'Amlodipine',
      dosage: '5mg',
      frequency: 'Once daily (morning)',
      duration: '1 month',
      quantity: 30,
      isControlledSubstance: false,
      dispensed: false,
      notes: 'For blood pressure management. Review in 4 weeks.',
    },
  });

  console.log('Created prescriptions');

  // --- Payments ---
  await prisma.payment.create({
    data: {
      bookingId: completedBooking.id,
      patientId: patient1.id,
      practitionerId: doctor1.id,
      amount: 350.00,
      currency: 'ZMW',
      paymentMethod: PaymentMethod.MOBILE_MONEY_MTN,
      paymentProvider: 'paystack',
      providerReference: 'PSK_REF_001',
      status: PaymentStatus.COMPLETED,
      commissionAmount: 52.50,
      practitionerPayout: 297.50,
      paidOutAt: new Date('2024-11-22'),
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: virtualBooking.id,
      patientId: patient2.id,
      practitionerId: doctor1.id,
      amount: 350.00,
      currency: 'ZMW',
      paymentMethod: PaymentMethod.CARD,
      paymentProvider: 'paystack',
      providerReference: 'PSK_REF_002',
      status: PaymentStatus.COMPLETED,
      commissionAmount: 52.50,
      practitionerPayout: 297.50,
    },
  });

  console.log('Created payments');

  // --- Reviews ---
  await prisma.review.create({
    data: {
      bookingId: completedBooking.id,
      patientId: patient1.id,
      practitionerId: doctor1.id,
      rating: 5,
      comment: 'Dr. Tembo was very professional and thorough. He arrived on time and explained everything clearly. Highly recommend!',
    },
  });

  await prisma.review.create({
    data: {
      bookingId: virtualBooking.id,
      patientId: patient2.id,
      practitionerId: doctor1.id,
      rating: 4,
      comment: 'Good virtual consultation. Clear advice and follow-up plan provided.',
    },
  });

  console.log('Created reviews');

  // --- Consent Records ---
  const consentTypes = [ConsentType.DATA_PROCESSING, ConsentType.TERMS_OF_SERVICE, ConsentType.PRIVACY_POLICY];
  for (const user of [patient1, patient2, doctor1, nurse1, physio1]) {
    for (const consentType of consentTypes) {
      await prisma.consentRecord.create({
        data: {
          userId: user.id,
          consentType,
          granted: true,
          grantedAt: new Date(),
          ipAddress: '127.0.0.1',
          userAgent: 'Seed Script',
        },
      });
    }
  }

  console.log('Created consent records');

  // --- Emergency Contacts ---
  await prisma.emergencyContact.create({
    data: {
      userId: patient1.id,
      name: 'Bwalya Mwamba',
      phone: '+260972345678',
      relationship: 'Spouse',
      isPrimary: true,
    },
  });

  await prisma.emergencyContact.create({
    data: {
      userId: patient2.id,
      name: 'Grace Banda',
      phone: '+260974567890',
      relationship: 'Wife',
      isPrimary: true,
    },
  });

  console.log('Created emergency contacts');

  // --- Notifications ---
  await prisma.notification.create({
    data: {
      userId: patient1.id,
      type: 'booking_accepted',
      title: 'Booking Confirmed',
      body: 'Your appointment with Nurse Mercy Phiri has been confirmed for the scheduled date.',
      channel: NotificationChannel.IN_APP,
      read: false,
      sentAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      userId: doctor1.id,
      type: 'new_booking',
      title: 'New Booking Request',
      body: 'You have a new home visit request from a patient in Lusaka.',
      channel: NotificationChannel.IN_APP,
      read: true,
      sentAt: new Date(Date.now() - 3600000),
      readAt: new Date(Date.now() - 3000000),
    },
  });

  console.log('Created notifications');

  // --- Audit Logs ---
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'VERIFY_PRACTITIONER',
        resourceType: 'PractitionerProfile',
        resourceId: doctorProfile?.id,
        details: { practitionerName: 'Dr. Joseph Tembo', hpczNumber: 'HPCZ-DOC-2024-0001' },
        ipAddress: '127.0.0.1',
        userAgent: 'Admin Portal',
      },
      {
        userId: patient1.id,
        action: 'CREATE_BOOKING',
        resourceType: 'Booking',
        resourceId: completedBooking.id,
        details: { serviceType: 'HOME_VISIT', practitioner: 'Dr. Joseph Tembo' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mobile App',
      },
    ],
  });

  console.log('Created audit logs');

  console.log('\n--- Seed Complete ---');
  console.log('Login credentials for all users: Password123!');
  console.log('Admin:        admin@ndiipano.co.zm');
  console.log('Patient 1:    chanda.mwamba@gmail.com');
  console.log('Patient 2:    mutale.banda@gmail.com');
  console.log('Doctor:       dr.tembo@ndiipano.co.zm');
  console.log('Nurse:        nurse.phiri@ndiipano.co.zm');
  console.log('Physio:       physio.lungu@ndiipano.co.zm');
  console.log('Unverified:   dr.pending@ndiipano.co.zm');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
