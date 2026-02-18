import { PrismaClient, UserRole, PractitionerType, Gender, ServiceType, BookingStatus, PaymentStatus, PaymentMethod, ConsentType, DocumentType, NotificationChannel, DiagnosticTestCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.practitionerTypeDiagnosticTest.deleteMany();
  await prisma.diagnosticTest.deleteMany();
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
      email: 'dr.tembo@ndipaano.co.zm',
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
      email: 'nurse.phiri@ndipaano.co.zm',
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
      email: 'physio.lungu@ndipaano.co.zm',
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
      email: 'dr.pending@ndipaano.co.zm',
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
      paymentMethod: PaymentMethod.VISA,
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

  // --- Diagnostic Tests ---
  const diagnosticTests = [
    // LAB_TEST (18)
    { name: 'Full Blood Count (FBC)', code: 'FBC', category: DiagnosticTestCategory.LAB_TEST, description: 'Complete blood cell count including red cells, white cells, and platelets', sortOrder: 1 },
    { name: 'Blood Glucose (Fasting)', code: 'GLU-F', category: DiagnosticTestCategory.LAB_TEST, description: 'Fasting blood sugar level measurement', sortOrder: 2 },
    { name: 'Blood Glucose (Random)', code: 'GLU-R', category: DiagnosticTestCategory.LAB_TEST, description: 'Random blood sugar level measurement', sortOrder: 3 },
    { name: 'HbA1c (Glycated Haemoglobin)', code: 'HBA1C', category: DiagnosticTestCategory.LAB_TEST, description: 'Average blood sugar control over 2-3 months', sortOrder: 4 },
    { name: 'Lipid Profile', code: 'LIPID', category: DiagnosticTestCategory.LAB_TEST, description: 'Cholesterol, triglycerides, HDL, and LDL levels', sortOrder: 5 },
    { name: 'Liver Function Tests (LFTs)', code: 'LFT', category: DiagnosticTestCategory.LAB_TEST, description: 'Assessment of liver enzyme levels and function', sortOrder: 6 },
    { name: 'Renal Function Tests (RFTs)', code: 'RFT', category: DiagnosticTestCategory.LAB_TEST, description: 'Kidney function markers including creatinine and urea', sortOrder: 7 },
    { name: 'Urinalysis', code: 'UA', category: DiagnosticTestCategory.LAB_TEST, description: 'Physical, chemical, and microscopic analysis of urine', sortOrder: 8 },
    { name: 'Thyroid Function Tests (TFTs)', code: 'TFT', category: DiagnosticTestCategory.LAB_TEST, description: 'TSH, T3, and T4 thyroid hormone levels', sortOrder: 9 },
    { name: 'Erythrocyte Sedimentation Rate (ESR)', code: 'ESR', category: DiagnosticTestCategory.LAB_TEST, description: 'Non-specific marker of inflammation', sortOrder: 10 },
    { name: 'C-Reactive Protein (CRP)', code: 'CRP', category: DiagnosticTestCategory.LAB_TEST, description: 'Acute-phase inflammatory marker', sortOrder: 11 },
    { name: 'Blood Group & Rh Factor', code: 'BG-RH', category: DiagnosticTestCategory.LAB_TEST, description: 'ABO blood grouping and Rhesus factor determination', sortOrder: 12 },
    { name: 'CD4 Count', code: 'CD4', category: DiagnosticTestCategory.LAB_TEST, description: 'Immune cell count for HIV monitoring', sortOrder: 13 },
    { name: 'Viral Load (HIV)', code: 'VL-HIV', category: DiagnosticTestCategory.LAB_TEST, description: 'Quantitative measurement of HIV RNA in blood', sortOrder: 14 },
    { name: 'Sputum AFB (TB Smear)', code: 'AFB', category: DiagnosticTestCategory.LAB_TEST, description: 'Acid-fast bacilli smear for tuberculosis screening', sortOrder: 15 },
    { name: 'Stool Microscopy', code: 'STOOL-M', category: DiagnosticTestCategory.LAB_TEST, description: 'Microscopic examination of stool for parasites and pathogens', sortOrder: 16 },
    { name: 'Beta-hCG (Pregnancy)', code: 'BHCG', category: DiagnosticTestCategory.LAB_TEST, description: 'Quantitative pregnancy hormone level', sortOrder: 17 },
    { name: 'Prostate-Specific Antigen (PSA)', code: 'PSA', category: DiagnosticTestCategory.LAB_TEST, description: 'Screening marker for prostate conditions', sortOrder: 18 },

    // RAPID_TEST (10)
    { name: 'Malaria RDT', code: 'MAL-RDT', category: DiagnosticTestCategory.RAPID_TEST, description: 'Rapid diagnostic test for malaria parasites', sortOrder: 1 },
    { name: 'HIV Rapid Test', code: 'HIV-RT', category: DiagnosticTestCategory.RAPID_TEST, description: 'Point-of-care HIV antibody/antigen test', sortOrder: 2 },
    { name: 'Hepatitis B Surface Antigen (HBsAg)', code: 'HBSAG-RT', category: DiagnosticTestCategory.RAPID_TEST, description: 'Rapid screening for hepatitis B infection', sortOrder: 3 },
    { name: 'Hepatitis C Rapid Test', code: 'HCV-RT', category: DiagnosticTestCategory.RAPID_TEST, description: 'Rapid screening for hepatitis C antibodies', sortOrder: 4 },
    { name: 'Syphilis RPR/VDRL', code: 'RPR', category: DiagnosticTestCategory.RAPID_TEST, description: 'Rapid plasma reagin test for syphilis screening', sortOrder: 5 },
    { name: 'Glucose Finger-Prick', code: 'GLU-FP', category: DiagnosticTestCategory.RAPID_TEST, description: 'Point-of-care blood glucose using glucometer', sortOrder: 6 },
    { name: 'Urine Pregnancy Test', code: 'UPT', category: DiagnosticTestCategory.RAPID_TEST, description: 'Qualitative urine hCG pregnancy detection', sortOrder: 7 },
    { name: 'COVID-19 Antigen Test', code: 'COV-AG', category: DiagnosticTestCategory.RAPID_TEST, description: 'Rapid antigen test for SARS-CoV-2', sortOrder: 8 },
    { name: 'Typhoid Widal Test', code: 'WIDAL', category: DiagnosticTestCategory.RAPID_TEST, description: 'Serological test for typhoid fever', sortOrder: 9 },
    { name: 'HemoCue (Haemoglobin)', code: 'HEMO', category: DiagnosticTestCategory.RAPID_TEST, description: 'Point-of-care haemoglobin measurement', sortOrder: 10 },

    // IMAGING (6)
    { name: 'Chest X-Ray', code: 'CXR', category: DiagnosticTestCategory.IMAGING, description: 'Radiographic imaging of the chest and lungs', sortOrder: 1 },
    { name: 'Abdominal Ultrasound', code: 'US-ABD', category: DiagnosticTestCategory.IMAGING, description: 'Ultrasound examination of abdominal organs', sortOrder: 2 },
    { name: 'Obstetric Ultrasound', code: 'US-OBS', category: DiagnosticTestCategory.IMAGING, description: 'Prenatal ultrasound for fetal assessment', sortOrder: 3 },
    { name: 'Pelvic Ultrasound', code: 'US-PEL', category: DiagnosticTestCategory.IMAGING, description: 'Ultrasound examination of pelvic organs', sortOrder: 4 },
    { name: 'Musculoskeletal X-Ray', code: 'XR-MSK', category: DiagnosticTestCategory.IMAGING, description: 'X-ray imaging of bones and joints', sortOrder: 5 },
    { name: 'ECG (Electrocardiogram)', code: 'ECG', category: DiagnosticTestCategory.IMAGING, description: 'Electrical activity recording of the heart', sortOrder: 6 },

    // SWAB_CULTURE (8)
    { name: 'Throat Swab & Culture', code: 'SW-THR', category: DiagnosticTestCategory.SWAB_CULTURE, description: 'Microbiological culture of throat specimen', sortOrder: 1 },
    { name: 'Wound Swab & Culture', code: 'SW-WND', category: DiagnosticTestCategory.SWAB_CULTURE, description: 'Microbiological culture of wound specimen', sortOrder: 2 },
    { name: 'Nasal Swab', code: 'SW-NAS', category: DiagnosticTestCategory.SWAB_CULTURE, description: 'Specimen collection from nasal passages', sortOrder: 3 },
    { name: 'High Vaginal Swab (HVS)', code: 'HVS', category: DiagnosticTestCategory.SWAB_CULTURE, description: 'Vaginal specimen for infection screening', sortOrder: 4 },
    { name: 'Urine Culture & Sensitivity', code: 'UC-S', category: DiagnosticTestCategory.SWAB_CULTURE, description: 'Urine culture with antibiotic sensitivity testing', sortOrder: 5 },
    { name: 'Blood Culture', code: 'BC', category: DiagnosticTestCategory.SWAB_CULTURE, description: 'Blood specimen culture for bacteraemia detection', sortOrder: 6 },
    { name: 'Ear Swab & Culture', code: 'SW-EAR', category: DiagnosticTestCategory.SWAB_CULTURE, description: 'Microbiological culture of ear specimen', sortOrder: 7 },
    { name: 'Urethral Swab', code: 'SW-URE', category: DiagnosticTestCategory.SWAB_CULTURE, description: 'Urethral specimen for STI screening', sortOrder: 8 },

    // SCREENING (9)
    { name: 'Blood Pressure Measurement', code: 'BP', category: DiagnosticTestCategory.SCREENING, description: 'Systolic and diastolic blood pressure reading', sortOrder: 1 },
    { name: 'BMI Assessment', code: 'BMI', category: DiagnosticTestCategory.SCREENING, description: 'Body Mass Index calculation and assessment', sortOrder: 2 },
    { name: 'Visual Acuity Test', code: 'VA', category: DiagnosticTestCategory.SCREENING, description: 'Basic eyesight assessment using Snellen chart', sortOrder: 3 },
    { name: 'Cervical Cancer Screening (VIA/VILI)', code: 'VIA', category: DiagnosticTestCategory.SCREENING, description: 'Visual inspection with acetic acid/Lugol\'s iodine', sortOrder: 4 },
    { name: 'Clinical Breast Examination', code: 'CBE', category: DiagnosticTestCategory.SCREENING, description: 'Physical examination of breast tissue for abnormalities', sortOrder: 5 },
    { name: 'Growth Monitoring (Paediatric)', code: 'GROWTH', category: DiagnosticTestCategory.SCREENING, description: 'Height, weight, and head circumference tracking for children', sortOrder: 6 },
    { name: 'Developmental Milestones Assessment', code: 'DEV', category: DiagnosticTestCategory.SCREENING, description: 'Age-appropriate developmental screening for children', sortOrder: 7 },
    { name: 'PHQ-9 Depression Screening', code: 'PHQ9', category: DiagnosticTestCategory.SCREENING, description: 'Patient Health Questionnaire for depression assessment', sortOrder: 8 },
    { name: 'Pulse Oximetry', code: 'SPO2', category: DiagnosticTestCategory.SCREENING, description: 'Non-invasive blood oxygen saturation measurement', sortOrder: 9 },

    // SPECIALIZED (6)
    { name: 'GeneXpert MTB/RIF (TB PCR)', code: 'GENEX', category: DiagnosticTestCategory.SPECIALIZED, description: 'Molecular test for TB and rifampicin resistance', sortOrder: 1 },
    { name: 'Pap Smear', code: 'PAP', category: DiagnosticTestCategory.SPECIALIZED, description: 'Cervical cytology for cancer screening', sortOrder: 2 },
    { name: 'Spirometry', code: 'SPIRO', category: DiagnosticTestCategory.SPECIALIZED, description: 'Lung function testing measuring airflow', sortOrder: 3 },
    { name: 'Audiometry', code: 'AUDIO', category: DiagnosticTestCategory.SPECIALIZED, description: 'Hearing assessment across frequency ranges', sortOrder: 4 },
    { name: 'Peak Expiratory Flow', code: 'PEF', category: DiagnosticTestCategory.SPECIALIZED, description: 'Maximum speed of exhalation for asthma monitoring', sortOrder: 5 },
    { name: 'INR / Coagulation Profile', code: 'INR', category: DiagnosticTestCategory.SPECIALIZED, description: 'Blood clotting time for anticoagulant therapy monitoring', sortOrder: 6 },
  ];

  const createdTests = await Promise.all(
    diagnosticTests.map((test) =>
      prisma.diagnosticTest.create({ data: test }),
    ),
  );

  console.log(`Created ${createdTests.length} diagnostic tests`);

  // Build a map of test code -> test id for easy reference
  const testByCode: Record<string, string> = {};
  for (const test of createdTests) {
    if (test.code) testByCode[test.code] = test.id;
  }

  // All test codes for reference
  const allTestCodes = Object.keys(testByCode);

  const labTests = diagnosticTests.filter(t => t.category === DiagnosticTestCategory.LAB_TEST).map(t => t.code!);
  const rapidTests = diagnosticTests.filter(t => t.category === DiagnosticTestCategory.RAPID_TEST).map(t => t.code!);
  const imagingTests = diagnosticTests.filter(t => t.category === DiagnosticTestCategory.IMAGING).map(t => t.code!);
  const swabTests = diagnosticTests.filter(t => t.category === DiagnosticTestCategory.SWAB_CULTURE).map(t => t.code!);
  const screeningTests = diagnosticTests.filter(t => t.category === DiagnosticTestCategory.SCREENING).map(t => t.code!);
  const specializedTests = diagnosticTests.filter(t => t.category === DiagnosticTestCategory.SPECIALIZED).map(t => t.code!);

  // Practitioner type -> test code mappings
  const practitionerTestMappings: Record<string, string[]> = {
    // GP & Specialist: All tests
    GENERAL_PRACTITIONER: allTestCodes,
    SPECIALIST_DOCTOR: allTestCodes,

    // Clinical Officer: All rapid, most lab, screening, swabs, basic imaging, some specialized
    CLINICAL_OFFICER: [
      ...rapidTests,
      ...labTests,
      ...screeningTests,
      ...swabTests,
      'CXR', 'US-ABD', 'US-PEL', 'ECG',
      'GENEX', 'SPIRO', 'PEF', 'INR',
    ],

    // Registered Nurse: Rapid tests, screening, basic lab (sample collection), basic swabs, ECG
    REGISTERED_NURSE: [
      ...rapidTests,
      ...screeningTests,
      'FBC', 'GLU-F', 'GLU-R', 'UA', 'BG-RH', 'BHCG', 'ESR', 'CRP',
      'SW-THR', 'SW-WND', 'SW-NAS', 'SW-EAR', 'UC-S',
      'ECG',
    ],

    // Enrolled Nurse: Basic rapid tests, screening, urinalysis, wound swabs
    ENROLLED_NURSE: [
      'MAL-RDT', 'HIV-RT', 'GLU-FP', 'UPT', 'COV-AG', 'HEMO',
      'BP', 'BMI', 'SPO2', 'GROWTH', 'DEV',
      'UA',
      'SW-WND',
    ],

    // Midwife: Obstetric-relevant tests
    MIDWIFE: [
      'MAL-RDT', 'HIV-RT', 'HBSAG-RT', 'HCV-RT', 'RPR', 'GLU-FP', 'UPT', 'HEMO',
      'FBC', 'GLU-F', 'GLU-R', 'BG-RH', 'BHCG', 'UA',
      'BP', 'BMI', 'VIA', 'CBE', 'GROWTH', 'DEV',
      'HVS', 'UC-S',
      'US-OBS', 'US-PEL',
      'PAP',
    ],

    // Physiotherapist: BP, BMI, pulse oximetry, MSK X-ray, spirometry, peak flow
    PHYSIOTHERAPIST: [
      'BP', 'BMI', 'SPO2',
      'XR-MSK',
      'SPIRO', 'PEF',
    ],

    // Pharmacist: Point-of-care rapid tests, basic screening
    PHARMACIST: [
      'MAL-RDT', 'GLU-FP', 'UPT', 'COV-AG', 'HEMO',
      'BP', 'BMI', 'SPO2',
    ],
  };

  // Create junction records
  const junctionData: Array<{ practitionerType: PractitionerType; diagnosticTestId: string }> = [];
  for (const [typeStr, codes] of Object.entries(practitionerTestMappings)) {
    const practType = typeStr as PractitionerType;
    // Deduplicate codes
    const uniqueCodes = [...new Set(codes)];
    for (const code of uniqueCodes) {
      if (testByCode[code]) {
        junctionData.push({
          practitionerType: practType,
          diagnosticTestId: testByCode[code],
        });
      }
    }
  }

  await prisma.practitionerTypeDiagnosticTest.createMany({
    data: junctionData,
    skipDuplicates: true,
  });

  console.log(`Created ${junctionData.length} practitioner-type test mappings`);

  console.log('\n--- Seed Complete ---');
  console.log('Login credentials for all users: Password123!');
  console.log('Admin:        admin@ndipaano.co.zm');
  console.log('Patient 1:    chanda.mwamba@gmail.com');
  console.log('Patient 2:    mutale.banda@gmail.com');
  console.log('Doctor:       dr.tembo@ndipaano.co.zm');
  console.log('Nurse:        nurse.phiri@ndipaano.co.zm');
  console.log('Physio:       physio.lungu@ndipaano.co.zm');
  console.log('Unverified:   dr.pending@ndipaano.co.zm');
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
