import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePrescriptionDto,
  PrescriptionQueryDto,
} from './dto/prescription.dto';

@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new prescription. Validates that:
   * - The medical record exists and belongs to the specified patient.
   * - The practitioner is the one who created the medical record.
   * - If the medication is a controlled substance, controlledSubstanceSchedule is provided.
   * - If prescribing a controlled substance, the practitioner has a ZAMRA registration number.
   */
  async create(practitionerUserId: string, dto: CreatePrescriptionDto) {
    // Verify the medical record exists
    const medicalRecord = await this.prisma.medicalRecord.findUnique({
      where: { id: dto.medicalRecordId },
    });

    if (!medicalRecord) {
      throw new NotFoundException('Medical record not found');
    }

    // Verify the practitioner created this medical record
    if (medicalRecord.practitionerId !== practitionerUserId) {
      throw new ForbiddenException(
        'You can only create prescriptions for medical records you authored',
      );
    }

    // Verify the patient matches the medical record
    if (medicalRecord.patientId !== dto.patientId) {
      throw new BadRequestException(
        'Patient ID does not match the patient on the medical record',
      );
    }

    // Controlled substance validations
    if (dto.isControlledSubstance) {
      if (!dto.controlledSubstanceSchedule) {
        throw new BadRequestException(
          'controlledSubstanceSchedule is required when prescribing a controlled substance',
        );
      }

      // Verify the practitioner has ZAMRA registration
      const practitioner = await this.prisma.practitionerProfile.findUnique({
        where: { userId: practitionerUserId },
        select: { zamraRegistration: true },
      });

      if (!practitioner) {
        throw new ForbiddenException('Practitioner profile not found');
      }

      if (!practitioner.zamraRegistration) {
        throw new ForbiddenException(
          'ZAMRA registration is required to prescribe controlled substances. ' +
            'Please update your practitioner profile with a valid ZAMRA registration number.',
        );
      }
    }

    // Validate pharmacy exists if provided
    if (dto.pharmacyId) {
      const pharmacy = await this.prisma.pharmacy.findUnique({
        where: { id: dto.pharmacyId },
      });

      if (!pharmacy) {
        throw new NotFoundException('Pharmacy not found');
      }

      if (!pharmacy.isActive) {
        throw new BadRequestException('The specified pharmacy is not active');
      }
    }

    const prescription = await this.prisma.prescription.create({
      data: {
        medicalRecordId: dto.medicalRecordId,
        patientId: dto.patientId,
        practitionerId: practitionerUserId,
        medicationName: dto.medicationName,
        dosage: dto.dosage,
        frequency: dto.frequency,
        duration: dto.duration,
        quantity: dto.quantity,
        isControlledSubstance: dto.isControlledSubstance ?? false,
        controlledSubstanceSchedule: dto.controlledSubstanceSchedule,
        notes: dto.notes,
        pharmacyId: dto.pharmacyId,
      },
      include: {
        medicalRecord: {
          select: {
            id: true,
            diagnosis: true,
            createdAt: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        practitioner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        pharmacy: true,
      },
    });

    this.logger.log(
      `Prescription created: ${prescription.id} by practitioner ${practitionerUserId}` +
        (dto.isControlledSubstance
          ? ` [CONTROLLED SUBSTANCE - Schedule ${dto.controlledSubstanceSchedule}]`
          : ''),
    );

    return prescription;
  }

  /**
   * List prescriptions for a specific patient with pagination.
   * Includes medication details and pharmacy info.
   */
  async findByPatient(patientUserId: string, query: PrescriptionQueryDto) {
    const { page = 1, limit = 20, dispensed, isControlledSubstance } = query;
    const skip = (page - 1) * limit;

    const where: any = { patientId: patientUserId };
    if (dispensed !== undefined) {
      where.dispensed = dispensed;
    }
    if (isControlledSubstance !== undefined) {
      where.isControlledSubstance = isControlledSubstance;
    }

    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          practitioner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          pharmacy: true,
          medicalRecord: {
            select: {
              id: true,
              diagnosis: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data: prescriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List prescriptions written by a specific practitioner with pagination.
   */
  async findByPractitioner(
    practitionerUserId: string,
    query: PrescriptionQueryDto,
  ) {
    const { page = 1, limit = 20, dispensed, isControlledSubstance } = query;
    const skip = (page - 1) * limit;

    const where: any = { practitionerId: practitionerUserId };
    if (dispensed !== undefined) {
      where.dispensed = dispensed;
    }
    if (isControlledSubstance !== undefined) {
      where.isControlledSubstance = isControlledSubstance;
    }

    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          pharmacy: true,
          medicalRecord: {
            select: {
              id: true,
              diagnosis: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data: prescriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single prescription by ID. Access is restricted to:
   * - The patient on the prescription
   * - The practitioner who wrote the prescription
   * - An admin or super admin
   * - (Pharmacy access checked via pharmacyId match)
   */
  async findById(id: string, requestingUserId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        practitioner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            practitionerProfile: {
              select: {
                hpczRegistrationNumber: true,
                zamraRegistration: true,
                practitionerType: true,
              },
            },
          },
        },
        pharmacy: true,
        medicalRecord: {
          select: {
            id: true,
            diagnosis: true,
            treatmentNotes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    // Check requesting user's role to determine access
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { id: true, role: true },
    });

    if (!requestingUser) {
      throw new ForbiddenException('Requesting user not found');
    }

    const isPatient = prescription.patientId === requestingUserId;
    const isPractitioner = prescription.practitionerId === requestingUserId;
    const isAdmin =
      requestingUser.role === 'ADMIN' || requestingUser.role === 'SUPER_ADMIN';

    // Check if the requesting user is associated with the assigned pharmacy
    // (pharmacist whose userId is associated with the pharmacy)
    const isPharmacyUser =
      requestingUser.role === 'PHARMACIST' && prescription.pharmacyId !== null;

    if (!isPatient && !isPractitioner && !isAdmin && !isPharmacyUser) {
      throw new ForbiddenException(
        'You do not have permission to view this prescription',
      );
    }

    return prescription;
  }

  /**
   * Get all prescriptions for a specific medical record.
   */
  async findByMedicalRecord(medicalRecordId: string) {
    const medicalRecord = await this.prisma.medicalRecord.findUnique({
      where: { id: medicalRecordId },
    });

    if (!medicalRecord) {
      throw new NotFoundException('Medical record not found');
    }

    return this.prisma.prescription.findMany({
      where: { medicalRecordId },
      orderBy: { createdAt: 'desc' },
      include: {
        practitioner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        pharmacy: true,
      },
    });
  }

  /**
   * Assign a pharmacy to a prescription for dispensing.
   * Can be done by the patient or the creating practitioner.
   */
  async assignPharmacy(
    prescriptionId: string,
    pharmacyId: string,
    requestingUserId: string,
  ) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    // Only the patient or the creating practitioner can assign a pharmacy
    const isPatient = prescription.patientId === requestingUserId;
    const isPractitioner = prescription.practitionerId === requestingUserId;

    // Also allow admins
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { role: true },
    });
    const isAdmin =
      requestingUser?.role === 'ADMIN' ||
      requestingUser?.role === 'SUPER_ADMIN';

    if (!isPatient && !isPractitioner && !isAdmin) {
      throw new ForbiddenException(
        'Only the patient, the prescribing practitioner, or an admin can assign a pharmacy',
      );
    }

    if (prescription.dispensed) {
      throw new BadRequestException(
        'Cannot reassign pharmacy for an already dispensed prescription',
      );
    }

    // Validate the pharmacy exists and is active
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    if (!pharmacy.isActive) {
      throw new BadRequestException('The specified pharmacy is not active');
    }

    return this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: { pharmacyId },
      include: {
        pharmacy: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        practitioner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Mark a prescription as dispensed by a pharmacy user.
   * Sets dispensed = true and records the dispensedAt timestamp.
   */
  async markDispensed(prescriptionId: string, pharmacyUserId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    if (prescription.dispensed) {
      throw new BadRequestException('Prescription has already been dispensed');
    }

    // Verify the user performing dispensing is an admin or pharmacist
    const user = await this.prisma.user.findUnique({
      where: { id: pharmacyUserId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isAdminOrPharmacist =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'PHARMACIST';

    if (!isAdminOrPharmacist) {
      throw new ForbiddenException(
        'Only pharmacy staff or administrators can mark prescriptions as dispensed',
      );
    }

    const updated = await this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        dispensed: true,
        dispensedAt: new Date(),
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        practitioner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        pharmacy: true,
      },
    });

    this.logger.log(
      `Prescription ${prescriptionId} marked as dispensed by user ${pharmacyUserId}`,
    );

    return updated;
  }

  /**
   * List controlled substance prescriptions written by a practitioner.
   * Used for ZAMRA compliance reporting.
   */
  async getControlledSubstances(
    practitionerUserId: string,
    query: PrescriptionQueryDto,
  ) {
    const { page = 1, limit = 20, dispensed } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      practitionerId: practitionerUserId,
      isControlledSubstance: true,
    };

    if (dispensed !== undefined) {
      where.dispensed = dispensed;
    }

    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          pharmacy: {
            select: {
              id: true,
              name: true,
              zamraRegistration: true,
            },
          },
          medicalRecord: {
            select: {
              id: true,
              diagnosis: true,
            },
          },
        },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data: prescriptions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
