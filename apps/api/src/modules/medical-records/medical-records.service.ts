import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, ConsentType } from '@prisma/client';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
  MedicalRecordQueryDto,
} from './dto/medical-record.dto';

@Injectable()
export class MedicalRecordsService {
  private readonly logger = new Logger(MedicalRecordsService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const keyString =
      this.configService.get<string>('encryption.key') ||
      'CHANGE_ME_32_BYTE_KEY_IN_PROD!!';

    // Ensure the key is exactly 32 bytes for AES-256
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(keyString)
      .digest();
  }

  // ---------------------------------------------------------------------------
  // Create Medical Record
  // ---------------------------------------------------------------------------

  async create(practitionerUserId: string, dto: CreateMedicalRecordDto) {
    // Verify the practitioner has a completed or in-progress booking with this patient
    const validBooking = await this.prisma.booking.findFirst({
      where: {
        practitionerId: practitionerUserId,
        patientId: dto.patientId,
        status: { in: ['COMPLETED', 'IN_PROGRESS'] },
      },
    });

    if (!validBooking) {
      throw new ForbiddenException(
        'You can only create medical records for patients with whom you have ' +
          'a completed or in-progress booking.',
      );
    }

    // If a specific booking is referenced, verify it belongs to this practitioner-patient pair
    if (dto.bookingId) {
      const specificBooking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
      });

      if (!specificBooking) {
        throw new NotFoundException('Referenced booking not found');
      }

      if (
        specificBooking.practitionerId !== practitionerUserId ||
        specificBooking.patientId !== dto.patientId
      ) {
        throw new ForbiddenException(
          'The referenced booking does not match the practitioner-patient relationship.',
        );
      }
    }

    // Encrypt sensitive fields
    const encryptedDiagnosis = this.encryptField(dto.diagnosis);
    const encryptedTreatmentNotes = this.encryptField(dto.treatmentNotes);

    const record = await this.prisma.medicalRecord.create({
      data: {
        patientId: dto.patientId,
        practitionerId: practitionerUserId,
        bookingId: dto.bookingId || null,
        diagnosis: encryptedDiagnosis,
        treatmentNotes: encryptedTreatmentNotes,
        vitalsJson: dto.vitalsJson ? (dto.vitalsJson as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
        booking: {
          select: { id: true, serviceType: true, scheduledAt: true },
        },
      },
    });

    this.logger.log(
      `Medical record ${record.id} created by practitioner ${practitionerUserId} for patient ${dto.patientId}`,
    );

    // Return with decrypted fields for the response
    return {
      ...record,
      diagnosis: dto.diagnosis,
      treatmentNotes: dto.treatmentNotes,
    };
  }

  // ---------------------------------------------------------------------------
  // Find Records by Patient
  // ---------------------------------------------------------------------------

  async findByPatient(
    patientUserId: string,
    query: MedicalRecordQueryDto,
  ) {
    // Check data processing consent
    await this.checkConsent(patientUserId, ConsentType.DATA_PROCESSING);

    const { page = 1, limit = 20, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      patientId: patientUserId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where,
        include: {
          practitioner: {
            select: { id: true, firstName: true, lastName: true },
          },
          booking: {
            select: { id: true, serviceType: true, scheduledAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);

    // Decrypt sensitive fields
    const decryptedRecords = records.map((record) =>
      this.decryptRecord(record),
    );

    return {
      data: decryptedRecords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Find Records by Practitioner
  // ---------------------------------------------------------------------------

  async findByPractitioner(
    practitionerUserId: string,
    query: MedicalRecordQueryDto,
  ) {
    const { page = 1, limit = 20, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      practitionerId: practitionerUserId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where,
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true },
          },
          booking: {
            select: { id: true, serviceType: true, scheduledAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);

    // Decrypt sensitive fields
    const decryptedRecords = records.map((record) =>
      this.decryptRecord(record),
    );

    return {
      data: decryptedRecords,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Find Record by ID
  // ---------------------------------------------------------------------------

  async findById(id: string, requestingUserId: string) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
        booking: {
          select: { id: true, serviceType: true, status: true, scheduledAt: true },
        },
        prescriptions: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    // Access check: requester must be the patient, the creating practitioner, or an admin
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { id: true, role: true },
    });

    if (!requestingUser) {
      throw new ForbiddenException('User not found');
    }

    const isPatient = record.patientId === requestingUserId;
    const isPractitioner = record.practitionerId === requestingUserId;
    const isAdmin =
      requestingUser.role === 'ADMIN' ||
      requestingUser.role === 'SUPER_ADMIN';

    if (!isPatient && !isPractitioner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to view this medical record',
      );
    }

    return this.decryptRecord(record);
  }

  // ---------------------------------------------------------------------------
  // Find Record by Booking
  // ---------------------------------------------------------------------------

  async findByBooking(bookingId: string, requestingUserId: string) {
    const records = await this.prisma.medicalRecord.findMany({
      where: { bookingId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
        booking: {
          select: { id: true, serviceType: true, status: true, scheduledAt: true },
        },
        prescriptions: true,
      },
    });

    if (records.length === 0) {
      throw new NotFoundException('No medical records found for this booking');
    }

    // Access check on the first record (all records for a booking share the same patient/practitioner)
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { id: true, role: true },
    });

    if (!requestingUser) {
      throw new ForbiddenException('User not found');
    }

    const firstRecord = records[0];
    const isPatient = firstRecord.patientId === requestingUserId;
    const isPractitioner = firstRecord.practitionerId === requestingUserId;
    const isAdmin =
      requestingUser.role === 'ADMIN' ||
      requestingUser.role === 'SUPER_ADMIN';

    if (!isPatient && !isPractitioner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to view medical records for this booking',
      );
    }

    return records.map((record) => this.decryptRecord(record));
  }

  // ---------------------------------------------------------------------------
  // Update Medical Record
  // ---------------------------------------------------------------------------

  async update(
    id: string,
    practitionerUserId: string,
    dto: UpdateMedicalRecordDto,
  ) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Medical record not found');
    }

    // Only the creating practitioner can update
    if (record.practitionerId !== practitionerUserId) {
      throw new ForbiddenException(
        'Only the practitioner who created this record can update it',
      );
    }

    // Check 24-hour edit window
    const hoursSinceCreation =
      (Date.now() - record.createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCreation > 24) {
      throw new BadRequestException(
        'Medical records can only be updated within 24 hours of creation. ' +
          `This record was created ${Math.floor(hoursSinceCreation)} hours ago.`,
      );
    }

    // Build update data, encrypting sensitive fields if provided
    const updateData: Record<string, unknown> = {};

    if (dto.diagnosis !== undefined) {
      updateData.diagnosis = this.encryptField(dto.diagnosis);
    }

    if (dto.treatmentNotes !== undefined) {
      updateData.treatmentNotes = this.encryptField(dto.treatmentNotes);
    }

    if (dto.vitalsJson !== undefined) {
      updateData.vitalsJson = dto.vitalsJson as unknown as object;
    }

    const updatedRecord = await this.prisma.medicalRecord.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
        booking: {
          select: { id: true, serviceType: true, scheduledAt: true },
        },
      },
    });

    this.logger.log(
      `Medical record ${id} updated by practitioner ${practitionerUserId}`,
    );

    return this.decryptRecord(updatedRecord);
  }

  // ---------------------------------------------------------------------------
  // Encryption: AES-256-GCM
  // ---------------------------------------------------------------------------

  encryptField(text: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all hex-encoded)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decryptField(encrypted: string): string {
    try {
      const parts = encrypted.split(':');

      if (parts.length !== 3) {
        // Field may not be encrypted (legacy data), return as-is
        return encrypted;
      }

      const [ivHex, authTagHex, ciphertext] = parts;

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Failed to decrypt field: ${(error as Error).message}`);
      // Return a placeholder rather than exposing encrypted data or crashing
      return '[Decryption failed - data may be corrupted]';
    }
  }

  // ---------------------------------------------------------------------------
  // Check Consent
  // ---------------------------------------------------------------------------

  async checkConsent(
    patientUserId: string,
    consentType: ConsentType,
  ): Promise<void> {
    const consent = await this.prisma.consentRecord.findFirst({
      where: {
        userId: patientUserId,
        consentType,
        granted: true,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!consent) {
      throw new ForbiddenException(
        `Patient has not granted ${consentType} consent. ` +
          'This consent is required to access medical records in compliance with the Zambia Data Protection Act.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private decryptRecord<
    T extends {
      diagnosis?: string | null;
      treatmentNotes?: string | null;
    },
  >(record: T): T {
    return {
      ...record,
      diagnosis: record.diagnosis
        ? this.decryptField(record.diagnosis)
        : record.diagnosis,
      treatmentNotes: record.treatmentNotes
        ? this.decryptField(record.treatmentNotes)
        : record.treatmentNotes,
    };
  }
}
