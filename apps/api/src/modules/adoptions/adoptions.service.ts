import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationChannel,
  AdoptionStatus,
  ConditionSummaryStatus,
  ServiceType,
  PractitionerType,
  UserRole,
} from '@prisma/client';
import {
  CreateConditionSummaryDto,
  UpdateConditionSummaryDto,
  ConditionSummaryQueryDto,
} from './dto/condition-summary.dto';
import {
  RequestByPractitionerDto,
  RequestByPatientDto,
  DeclineAdoptionDto,
  ReleaseAdoptionDto,
  AdoptionQueryDto,
  MatchedPatientsQueryDto,
} from './dto/adoption.dto';

// ServiceType → PractitionerType mapping
const SERVICE_TYPE_TO_PRACTITIONER_TYPES: Record<string, PractitionerType[]> = {
  GENERAL_CONSULTATION: [PractitionerType.GENERAL_PRACTITIONER, PractitionerType.SPECIALIST_DOCTOR, PractitionerType.CLINICAL_OFFICER],
  NURSING_CARE: [PractitionerType.REGISTERED_NURSE, PractitionerType.ENROLLED_NURSE],
  WOUND_DRESSING: [PractitionerType.REGISTERED_NURSE, PractitionerType.ENROLLED_NURSE, PractitionerType.CLINICAL_OFFICER],
  INJECTION_ADMINISTRATION: [PractitionerType.REGISTERED_NURSE, PractitionerType.ENROLLED_NURSE, PractitionerType.CLINICAL_OFFICER],
  IV_THERAPY: [PractitionerType.REGISTERED_NURSE, PractitionerType.CLINICAL_OFFICER],
  PHYSIOTHERAPY: [PractitionerType.PHYSIOTHERAPIST],
  MATERNAL_CARE: [PractitionerType.MIDWIFE, PractitionerType.REGISTERED_NURSE],
  CHILD_WELLNESS: [PractitionerType.GENERAL_PRACTITIONER, PractitionerType.SPECIALIST_DOCTOR, PractitionerType.REGISTERED_NURSE],
  CHRONIC_DISEASE_MANAGEMENT: [PractitionerType.GENERAL_PRACTITIONER, PractitionerType.SPECIALIST_DOCTOR, PractitionerType.CLINICAL_OFFICER],
  PALLIATIVE_CARE: [PractitionerType.REGISTERED_NURSE, PractitionerType.GENERAL_PRACTITIONER, PractitionerType.SPECIALIST_DOCTOR],
  POST_OPERATIVE_CARE: [PractitionerType.REGISTERED_NURSE, PractitionerType.GENERAL_PRACTITIONER, PractitionerType.SPECIALIST_DOCTOR],
  MENTAL_HEALTH: [PractitionerType.GENERAL_PRACTITIONER, PractitionerType.SPECIALIST_DOCTOR],
  PHARMACY_DELIVERY: [PractitionerType.PHARMACIST],
  LAB_SAMPLE_COLLECTION: [PractitionerType.REGISTERED_NURSE, PractitionerType.ENROLLED_NURSE, PractitionerType.CLINICAL_OFFICER],
  EMERGENCY_TRIAGE: [PractitionerType.GENERAL_PRACTITIONER, PractitionerType.SPECIALIST_DOCTOR, PractitionerType.CLINICAL_OFFICER, PractitionerType.REGISTERED_NURSE],
  VIRTUAL_CONSULTATION: [PractitionerType.GENERAL_PRACTITIONER, PractitionerType.SPECIALIST_DOCTOR, PractitionerType.CLINICAL_OFFICER],
};

const PRACTITIONER_PRISMA_ROLES: UserRole[] = [
  UserRole.NURSE,
  UserRole.CLINICAL_OFFICER,
  UserRole.DOCTOR,
  UserRole.PHYSIOTHERAPIST,
  UserRole.PHARMACIST,
];

@Injectable()
export class AdoptionsService {
  private readonly logger = new Logger(AdoptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ===========================================================================
  // Condition Summaries
  // ===========================================================================

  async createConditionSummary(patientId: string, dto: CreateConditionSummaryDto) {
    const summary = await this.prisma.conditionSummary.create({
      data: {
        patientId,
        symptoms: dto.symptoms,
        serviceType: dto.serviceType,
        urgency: (dto.urgency as any) || 'MODERATE',
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address,
        city: dto.city,
        province: dto.province,
        additionalNotes: dto.additionalNotes,
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: patientId,
        action: 'CONDITION_SUMMARY_CREATED',
        resourceType: 'ConditionSummary',
        resourceId: summary.id,
      },
    });

    return summary;
  }

  async getMyConditionSummaries(patientId: string, query: ConditionSummaryQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { patientId };
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.conditionSummary.findMany({
        where,
        include: {
          adoptions: {
            select: {
              id: true,
              status: true,
              practitioner: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conditionSummary.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getConditionSummaryById(userId: string, role: string, id: string) {
    const summary = await this.prisma.conditionSummary.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        adoptions: {
          include: {
            practitioner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                practitionerProfile: { select: { practitionerType: true, ratingAvg: true } },
              },
            },
          },
        },
      },
    });

    if (!summary) {
      throw new NotFoundException('Condition summary not found');
    }

    // Access check: patient owns it, or practitioner has a relevant adoption/match
    if (role === 'PATIENT' && summary.patientId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return summary;
  }

  async updateConditionSummary(patientId: string, id: string, dto: UpdateConditionSummaryDto) {
    const summary = await this.prisma.conditionSummary.findUnique({ where: { id } });
    if (!summary) throw new NotFoundException('Condition summary not found');
    if (summary.patientId !== patientId) throw new ForbiddenException('Access denied');
    if (summary.status !== 'ACTIVE') throw new BadRequestException('Can only update ACTIVE summaries');

    const updated = await this.prisma.conditionSummary.update({
      where: { id },
      data: {
        ...(dto.symptoms && { symptoms: dto.symptoms }),
        ...(dto.urgency && { urgency: dto.urgency as any }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.additionalNotes !== undefined && { additionalNotes: dto.additionalNotes }),
      },
    });

    return updated;
  }

  async withdrawConditionSummary(patientId: string, id: string) {
    const summary = await this.prisma.conditionSummary.findUnique({ where: { id } });
    if (!summary) throw new NotFoundException('Condition summary not found');
    if (summary.patientId !== patientId) throw new ForbiddenException('Access denied');
    if (summary.status === 'WITHDRAWN') throw new BadRequestException('Already withdrawn');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.conditionSummary.update({
        where: { id },
        data: { status: ConditionSummaryStatus.WITHDRAWN, withdrawnAt: new Date() },
      });

      // Decline all pending adoptions
      await tx.patientAdoption.updateMany({
        where: {
          conditionSummaryId: id,
          status: { in: [AdoptionStatus.PENDING_PRACTITIONER_CONSENT, AdoptionStatus.PENDING_PATIENT_CONSENT] },
        },
        data: { status: AdoptionStatus.DECLINED, declinedAt: new Date(), declineReason: 'Condition withdrawn by patient' },
      });

      await tx.auditLog.create({
        data: {
          userId: patientId,
          action: 'CONDITION_SUMMARY_WITHDRAWN',
          resourceType: 'ConditionSummary',
          resourceId: id,
        },
      });

      return updated;
    });
  }

  // ===========================================================================
  // Matching Algorithm
  // ===========================================================================

  async getMatchedPatients(practitionerId: string, query: MatchedPatientsQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Get practitioner profile
    const profile = await this.prisma.practitionerProfile.findFirst({
      where: { userId: practitionerId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    if (!profile.hpczVerified) {
      throw new ForbiddenException('HPCZ verification required to view matched patients');
    }

    if (!profile.isAvailable) {
      return { data: [], total: 0, page, limit };
    }

    // Map practitioner type to matching service types
    const matchingServiceTypes: string[] = [];
    for (const [serviceType, practTypes] of Object.entries(SERVICE_TYPE_TO_PRACTITIONER_TYPES)) {
      if (practTypes.includes(profile.practitionerType)) {
        matchingServiceTypes.push(serviceType);
      }
    }

    if (matchingServiceTypes.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    const serviceTypePlaceholders = matchingServiceTypes.map((_, i) => `$${i + 1}::text`).join(', ');
    let paramIndex = matchingServiceTypes.length + 1;
    const params: any[] = [...matchingServiceTypes];

    // Build distance calculation if practitioner has location
    let distanceSelect = 'NULL::float AS distance';
    let distanceFilter = '';

    if (profile.latitude && profile.longitude) {
      distanceSelect = `
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($${paramIndex})) * cos(radians(cs."latitude")) *
            cos(radians(cs."longitude") - radians($${paramIndex + 1})) +
            sin(radians($${paramIndex})) * sin(radians(cs."latitude"))
          ))
        )) AS distance`;
      distanceFilter = `
        AND cs."latitude" IS NOT NULL
        AND cs."longitude" IS NOT NULL
        AND (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($${paramIndex})) * cos(radians(cs."latitude")) *
            cos(radians(cs."longitude") - radians($${paramIndex + 1})) +
            sin(radians($${paramIndex})) * sin(radians(cs."latitude"))
          ))
        )) <= $${paramIndex + 2}`;
      params.push(profile.latitude, profile.longitude, profile.serviceRadiusKm);
      paramIndex += 3;
    }

    // Practitioner ID for excluding existing requests
    params.push(practitionerId);
    const practIdParam = paramIndex;
    paramIndex++;

    const urgencyOrder = `
      CASE cs."urgency"
        WHEN 'EMERGENCY' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MODERATE' THEN 3
        WHEN 'LOW' THEN 4
      END`;

    const dataQuery = `
      SELECT
        cs."id",
        cs."patientId",
        cs."symptoms",
        cs."serviceType",
        cs."urgency",
        cs."latitude",
        cs."longitude",
        cs."address",
        cs."city",
        cs."province",
        cs."additionalNotes",
        cs."createdAt",
        u."firstName" AS "patientFirstName",
        u."lastName" AS "patientLastName",
        ${distanceSelect}
      FROM condition_summaries cs
      INNER JOIN users u ON u."id" = cs."patientId"
      WHERE cs."status" = 'ACTIVE'
        AND cs."serviceType"::text IN (${serviceTypePlaceholders})
        -- Exclude already adopted conditions
        AND NOT EXISTS (
          SELECT 1 FROM patient_adoptions pa
          WHERE pa."conditionSummaryId" = cs."id"
            AND pa."status" = 'ACTIVE'
        )
        -- Exclude conditions where this practitioner already has a pending/active request
        AND NOT EXISTS (
          SELECT 1 FROM patient_adoptions pa
          WHERE pa."conditionSummaryId" = cs."id"
            AND pa."practitionerId" = $${practIdParam}
            AND pa."status" IN ('PENDING_PRACTITIONER_CONSENT', 'PENDING_PATIENT_CONSENT', 'ACTIVE')
        )
        ${distanceFilter}
      ORDER BY ${urgencyOrder} ASC, ${profile.latitude ? 'distance ASC' : 'cs."createdAt" DESC'}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM condition_summaries cs
      INNER JOIN users u ON u."id" = cs."patientId"
      WHERE cs."status" = 'ACTIVE'
        AND cs."serviceType"::text IN (${serviceTypePlaceholders})
        AND NOT EXISTS (
          SELECT 1 FROM patient_adoptions pa
          WHERE pa."conditionSummaryId" = cs."id"
            AND pa."status" = 'ACTIVE'
        )
        AND NOT EXISTS (
          SELECT 1 FROM patient_adoptions pa
          WHERE pa."conditionSummaryId" = cs."id"
            AND pa."practitionerId" = $${practIdParam}
            AND pa."status" IN ('PENDING_PRACTITIONER_CONSENT', 'PENDING_PATIENT_CONSENT', 'ACTIVE')
        )
        ${distanceFilter}
    `;

    const countParams = params.slice(0, -2); // remove limit/offset

    const [data, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe(dataQuery, ...params),
      this.prisma.$queryRawUnsafe(countQuery, ...countParams),
    ]);

    return {
      data,
      total: (countResult as any[])[0]?.total || 0,
      page,
      limit,
    };
  }

  // ===========================================================================
  // Adoption Requests
  // ===========================================================================

  async requestByPractitioner(practitionerId: string, dto: RequestByPractitionerDto) {
    const summary = await this.prisma.conditionSummary.findUnique({
      where: { id: dto.conditionSummaryId },
    });
    if (!summary) throw new NotFoundException('Condition summary not found');
    if (summary.status !== 'ACTIVE') throw new BadRequestException('Condition is not available for adoption');

    // Check if already adopted
    const existingActive = await this.prisma.patientAdoption.findFirst({
      where: { conditionSummaryId: dto.conditionSummaryId, status: AdoptionStatus.ACTIVE },
    });
    if (existingActive) throw new BadRequestException('Condition already has an active adoption');

    // Check if this practitioner already requested
    const existing = await this.prisma.patientAdoption.findUnique({
      where: { conditionSummaryId_practitionerId: { conditionSummaryId: dto.conditionSummaryId, practitionerId } },
    });
    if (existing && ['PENDING_PRACTITIONER_CONSENT', 'PENDING_PATIENT_CONSENT', 'ACTIVE'].includes(existing.status)) {
      throw new BadRequestException('You already have an active or pending request for this condition');
    }

    const adoption = await this.prisma.$transaction(async (tx) => {
      // If there was a declined/released one, delete it and create fresh
      if (existing) {
        await tx.patientAdoption.delete({ where: { id: existing.id } });
      }

      const adoption = await tx.patientAdoption.create({
        data: {
          conditionSummaryId: dto.conditionSummaryId,
          patientId: summary.patientId,
          practitionerId,
          status: AdoptionStatus.PENDING_PATIENT_CONSENT,
          initiatedBy: 'PRACTITIONER',
        },
        include: {
          practitioner: { select: { id: true, firstName: true, lastName: true } },
          conditionSummary: { select: { id: true, symptoms: true, serviceType: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: practitionerId,
          action: 'ADOPTION_REQUESTED_BY_PRACTITIONER',
          resourceType: 'PatientAdoption',
          resourceId: adoption.id,
          details: { conditionSummaryId: dto.conditionSummaryId },
        },
      });

      return adoption;
    });

    // Notify patient (outside tx)
    try {
      await this.notificationsService.send({
        userId: summary.patientId,
        type: 'ADOPTION_REQUEST',
        title: 'Practitioner Adoption Request',
        body: `Dr. ${adoption.practitioner.firstName} ${adoption.practitioner.lastName} has requested to adopt your care.`,
        channel: NotificationChannel.IN_APP,
      });
    } catch (e) {
      this.logger.warn(`Failed to send adoption notification: ${e}`);
    }

    return adoption;
  }

  async requestByPatient(patientId: string, dto: RequestByPatientDto) {
    const summary = await this.prisma.conditionSummary.findUnique({
      where: { id: dto.conditionSummaryId },
    });
    if (!summary) throw new NotFoundException('Condition summary not found');
    if (summary.patientId !== patientId) throw new ForbiddenException('Not your condition summary');
    if (summary.status !== 'ACTIVE') throw new BadRequestException('Condition is not available');

    // Verify practitioner exists and is a practitioner
    const practitioner = await this.prisma.user.findUnique({
      where: { id: dto.practitionerId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });
    if (!practitioner || !PRACTITIONER_PRISMA_ROLES.includes(practitioner.role as UserRole)) {
      throw new NotFoundException('Practitioner not found');
    }

    const existing = await this.prisma.patientAdoption.findUnique({
      where: { conditionSummaryId_practitionerId: { conditionSummaryId: dto.conditionSummaryId, practitionerId: dto.practitionerId } },
    });
    if (existing && ['PENDING_PRACTITIONER_CONSENT', 'PENDING_PATIENT_CONSENT', 'ACTIVE'].includes(existing.status)) {
      throw new BadRequestException('An active or pending request already exists');
    }

    const adoption = await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.patientAdoption.delete({ where: { id: existing.id } });
      }

      const adoption = await tx.patientAdoption.create({
        data: {
          conditionSummaryId: dto.conditionSummaryId,
          patientId,
          practitionerId: dto.practitionerId,
          status: AdoptionStatus.PENDING_PRACTITIONER_CONSENT,
          initiatedBy: 'PATIENT',
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          conditionSummary: { select: { id: true, symptoms: true, serviceType: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: patientId,
          action: 'ADOPTION_REQUESTED_BY_PATIENT',
          resourceType: 'PatientAdoption',
          resourceId: adoption.id,
          details: { conditionSummaryId: dto.conditionSummaryId, practitionerId: dto.practitionerId },
        },
      });

      return adoption;
    });

    // Notify practitioner
    try {
      await this.notificationsService.send({
        userId: dto.practitionerId,
        type: 'ADOPTION_REQUEST',
        title: 'Patient Adoption Request',
        body: `${adoption.patient.firstName} ${adoption.patient.lastName} has requested you to adopt their care.`,
        channel: NotificationChannel.IN_APP,
      });
    } catch (e) {
      this.logger.warn(`Failed to send adoption notification: ${e}`);
    }

    return adoption;
  }

  // ===========================================================================
  // Consent / Decline / Release
  // ===========================================================================

  async consent(userId: string, role: string, adoptionId: string) {
    const adoption = await this.prisma.patientAdoption.findUnique({
      where: { id: adoptionId },
      include: {
        conditionSummary: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!adoption) throw new NotFoundException('Adoption not found');

    // Validate the right person is consenting
    if (adoption.status === AdoptionStatus.PENDING_PATIENT_CONSENT) {
      if (userId !== adoption.patientId) throw new ForbiddenException('Only the patient can consent');
    } else if (adoption.status === AdoptionStatus.PENDING_PRACTITIONER_CONSENT) {
      if (userId !== adoption.practitionerId) throw new ForbiddenException('Only the practitioner can consent');
    } else {
      throw new BadRequestException('Adoption is not in a pending state');
    }

    return this.prisma.$transaction(async (tx) => {
      // Activate the adoption
      const updated = await tx.patientAdoption.update({
        where: { id: adoptionId },
        data: {
          status: AdoptionStatus.ACTIVE,
          consentedAt: new Date(),
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          practitioner: { select: { id: true, firstName: true, lastName: true } },
          conditionSummary: true,
        },
      });

      // Mark condition as ADOPTED
      await tx.conditionSummary.update({
        where: { id: adoption.conditionSummaryId },
        data: { status: ConditionSummaryStatus.ADOPTED },
      });

      // Decline all other pending adoptions for same condition
      await tx.patientAdoption.updateMany({
        where: {
          conditionSummaryId: adoption.conditionSummaryId,
          id: { not: adoptionId },
          status: { in: [AdoptionStatus.PENDING_PRACTITIONER_CONSENT, AdoptionStatus.PENDING_PATIENT_CONSENT] },
        },
        data: {
          status: AdoptionStatus.DECLINED,
          declinedAt: new Date(),
          declineReason: 'Another adoption was accepted',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ADOPTION_CONSENTED',
          resourceType: 'PatientAdoption',
          resourceId: adoptionId,
        },
      });

      return updated;
    }).then(async (result) => {
      // Notify the other party (outside tx)
      const notifyUserId = userId === adoption.patientId ? adoption.practitionerId : adoption.patientId;
      const actorName = userId === adoption.patientId
        ? `${adoption.patient.firstName} ${adoption.patient.lastName}`
        : `Dr. ${adoption.practitioner.firstName} ${adoption.practitioner.lastName}`;

      try {
        await this.notificationsService.send({
          userId: notifyUserId,
          type: 'ADOPTION_ACCEPTED',
          title: 'Adoption Accepted',
          body: `${actorName} has accepted the care adoption.`,
          channel: NotificationChannel.IN_APP,
        });
      } catch (e) {
        this.logger.warn(`Failed to send consent notification: ${e}`);
      }

      return result;
    });
  }

  async decline(userId: string, role: string, adoptionId: string, dto: DeclineAdoptionDto) {
    const adoption = await this.prisma.patientAdoption.findUnique({
      where: { id: adoptionId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!adoption) throw new NotFoundException('Adoption not found');

    if (userId !== adoption.patientId && userId !== adoption.practitionerId) {
      throw new ForbiddenException('Access denied');
    }

    const pendingStatuses: string[] = [AdoptionStatus.PENDING_PRACTITIONER_CONSENT, AdoptionStatus.PENDING_PATIENT_CONSENT];
    if (!pendingStatuses.includes(adoption.status)) {
      throw new BadRequestException('Can only decline pending adoptions');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.patientAdoption.update({
        where: { id: adoptionId },
        data: {
          status: AdoptionStatus.DECLINED,
          declinedAt: new Date(),
          declineReason: dto.reason,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ADOPTION_DECLINED',
          resourceType: 'PatientAdoption',
          resourceId: adoptionId,
          details: { reason: dto.reason },
        },
      });

      return updated;
    });

    // Notify
    const notifyUserId = userId === adoption.patientId ? adoption.practitionerId : adoption.patientId;
    try {
      await this.notificationsService.send({
        userId: notifyUserId,
        type: 'ADOPTION_DECLINED',
        title: 'Adoption Declined',
        body: `The care adoption request was declined.${dto.reason ? ` Reason: ${dto.reason}` : ''}`,
        channel: NotificationChannel.IN_APP,
      });
    } catch (e) {
      this.logger.warn(`Failed to send decline notification: ${e}`);
    }

    return updated;
  }

  async release(userId: string, role: string, adoptionId: string, dto: ReleaseAdoptionDto) {
    const adoption = await this.prisma.patientAdoption.findUnique({
      where: { id: adoptionId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        practitioner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!adoption) throw new NotFoundException('Adoption not found');

    if (userId !== adoption.patientId && userId !== adoption.practitionerId) {
      throw new ForbiddenException('Access denied');
    }

    if (adoption.status !== AdoptionStatus.ACTIVE) {
      throw new BadRequestException('Can only release active adoptions');
    }

    const releasedBy = userId === adoption.patientId ? 'PATIENT' : 'PRACTITIONER';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.patientAdoption.update({
        where: { id: adoptionId },
        data: {
          status: AdoptionStatus.RELEASED,
          releasedAt: new Date(),
          releaseReason: dto.reason,
          releasedBy,
        },
      });

      // Set condition back to ACTIVE so it can be matched again
      await tx.conditionSummary.update({
        where: { id: adoption.conditionSummaryId },
        data: { status: ConditionSummaryStatus.ACTIVE },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ADOPTION_RELEASED',
          resourceType: 'PatientAdoption',
          resourceId: adoptionId,
          details: { reason: dto.reason, releasedBy },
        },
      });

      // Notify the other party
      const notifyUserId = userId === adoption.patientId ? adoption.practitionerId : adoption.patientId;
      try {
        await this.notificationsService.send({
          userId: notifyUserId,
          type: 'ADOPTION_RELEASED',
          title: 'Adoption Released',
          body: `The care adoption has been released.${dto.reason ? ` Reason: ${dto.reason}` : ''}`,
          channel: NotificationChannel.IN_APP,
        });
      } catch (e) {
        this.logger.warn(`Failed to send release notification: ${e}`);
      }

      return updated;
    });
  }

  // ===========================================================================
  // List / Detail
  // ===========================================================================

  async getMyAdoptions(userId: string, role: string, query: AdoptionQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role === 'PATIENT') {
      where.patientId = userId;
    } else {
      where.practitionerId = userId;
    }
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.patientAdoption.findMany({
        where,
        include: {
          conditionSummary: {
            select: { id: true, symptoms: true, serviceType: true, urgency: true, status: true },
          },
          patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          practitioner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              practitionerProfile: { select: { practitionerType: true, ratingAvg: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.patientAdoption.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getAdoptionById(userId: string, role: string, id: string) {
    const adoption = await this.prisma.patientAdoption.findUnique({
      where: { id },
      include: {
        conditionSummary: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
        practitioner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            practitionerProfile: {
              select: { practitionerType: true, ratingAvg: true, ratingCount: true, bio: true },
            },
          },
        },
      },
    });

    if (!adoption) throw new NotFoundException('Adoption not found');
    if (adoption.patientId !== userId && adoption.practitionerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return adoption;
  }
}
