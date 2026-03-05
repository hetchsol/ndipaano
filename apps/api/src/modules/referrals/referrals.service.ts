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
  Prisma,
  ReferralStatus,
  UserRole,
} from '@prisma/client';
import {
  CreateReferralDto,
  ReferralQueryDto,
  DeclineReferralDto,
  CompleteReferralDto,
} from './dto/referral.dto';

const PRACTITIONER_PRISMA_ROLES: UserRole[] = [
  UserRole.NURSE,
  UserRole.CLINICAL_OFFICER,
  UserRole.DOCTOR,
  UserRole.PHYSIOTHERAPIST,
  UserRole.PHARMACIST,
];

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ===========================================================================
  // Create Referral
  // ===========================================================================

  async create(practitionerId: string, dto: CreateReferralDto) {
    // Validate patient exists
    const patient = await this.prisma.user.findUnique({
      where: { id: dto.patientId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new NotFoundException('Patient not found');
    }

    // Validate referred practitioner if provided
    if (dto.referredPractitionerId) {
      const referred = await this.prisma.user.findUnique({
        where: { id: dto.referredPractitionerId },
        select: { id: true, role: true },
      });
      if (!referred || !PRACTITIONER_PRISMA_ROLES.includes(referred.role as UserRole)) {
        throw new NotFoundException('Referred practitioner not found');
      }
    }

    // Validate booking if provided
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({
        where: { id: dto.bookingId },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
    }

    const referral = await this.prisma.referral.create({
      data: {
        referringPractitionerId: practitionerId,
        patientId: dto.patientId,
        reason: dto.reason,
        urgency: dto.urgency,
        referredPractitionerId: dto.referredPractitionerId,
        bookingId: dto.bookingId,
        clinicalNotes: dto.clinicalNotes,
        specialtyRequired: dto.specialtyRequired,
        status: ReferralStatus.SENT,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        referringPractitioner: { select: { id: true, firstName: true, lastName: true } },
        referredPractitioner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.logger.log(`Referral created: ${referral.id} by practitioner ${practitionerId}`);

    // Notify patient
    try {
      await this.notificationsService.sendToUser(
        dto.patientId,
        'REFERRAL_CREATED',
        'New Referral',
        `You have been referred for: ${dto.reason}`,
        NotificationChannel.IN_APP,
        { referralId: referral.id },
      );
    } catch (err) {
      this.logger.warn(`Failed to send referral notification to patient: ${err}`);
    }

    // Notify referred practitioner
    if (dto.referredPractitionerId) {
      try {
        await this.notificationsService.sendToUser(
          dto.referredPractitionerId,
          'REFERRAL_RECEIVED',
          'New Referral Received',
          `You have received a referral for patient ${patient.firstName} ${patient.lastName}`,
          NotificationChannel.IN_APP,
          { referralId: referral.id },
        );
      } catch (err) {
        this.logger.warn(`Failed to send referral notification to referred practitioner: ${err}`);
      }
    }

    return referral;
  }

  // ===========================================================================
  // List Referrals (role-filtered)
  // ===========================================================================

  async findAll(userId: string, role: string, query: ReferralQueryDto) {
    const { page = 1, limit = 20, status, urgency } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReferralWhereInput = {};

    if (role === UserRole.PATIENT) {
      where.patientId = userId;
    } else if (PRACTITIONER_PRISMA_ROLES.includes(role as UserRole)) {
      where.OR = [
        { referringPractitionerId: userId },
        { referredPractitionerId: userId },
      ];
    }
    // ADMIN / SUPER_ADMIN see all — no filter

    if (status) where.status = status;
    if (urgency) where.urgency = urgency;

    const [data, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          referringPractitioner: { select: { id: true, firstName: true, lastName: true } },
          referredPractitioner: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ===========================================================================
  // Get Referral by ID
  // ===========================================================================

  async findById(userId: string, role: string, id: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        referringPractitioner: { select: { id: true, firstName: true, lastName: true } },
        referredPractitioner: { select: { id: true, firstName: true, lastName: true } },
        booking: { select: { id: true, serviceType: true, scheduledAt: true, status: true } },
        referredBooking: { select: { id: true, serviceType: true, scheduledAt: true, status: true } },
      },
    });

    if (!referral) {
      throw new NotFoundException('Referral not found');
    }

    // Access check: patient, referring, referred, or admin
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    const isInvolved =
      referral.patientId === userId ||
      referral.referringPractitionerId === userId ||
      referral.referredPractitionerId === userId;

    if (!isAdmin && !isInvolved) {
      throw new ForbiddenException('You do not have access to this referral');
    }

    return referral;
  }

  // ===========================================================================
  // Status Transitions
  // ===========================================================================

  async accept(userId: string, id: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    if (referral.referredPractitionerId !== userId) {
      throw new ForbiddenException('Only the referred practitioner can accept this referral');
    }
    if (referral.status !== ReferralStatus.SENT) {
      throw new BadRequestException(`Cannot accept referral with status ${referral.status}`);
    }

    const updated = await this.prisma.referral.update({
      where: { id },
      data: { status: ReferralStatus.ACCEPTED, acceptedAt: new Date() },
    });

    try {
      await this.notificationsService.sendToUser(
        referral.patientId,
        'REFERRAL_ACCEPTED',
        'Referral Accepted',
        'Your referral has been accepted',
        NotificationChannel.IN_APP,
        { referralId: id },
      );
      await this.notificationsService.sendToUser(
        referral.referringPractitionerId,
        'REFERRAL_ACCEPTED',
        'Referral Accepted',
        'Your referral has been accepted by the referred practitioner',
        NotificationChannel.IN_APP,
        { referralId: id },
      );
    } catch (err) {
      this.logger.warn(`Failed to send referral accept notifications: ${err}`);
    }

    return updated;
  }

  async decline(userId: string, id: string, dto: DeclineReferralDto) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    if (referral.referredPractitionerId !== userId) {
      throw new ForbiddenException('Only the referred practitioner can decline this referral');
    }
    if (referral.status !== ReferralStatus.SENT) {
      throw new BadRequestException(`Cannot decline referral with status ${referral.status}`);
    }

    const updated = await this.prisma.referral.update({
      where: { id },
      data: {
        status: ReferralStatus.DECLINED,
        declinedAt: new Date(),
        declineReason: dto.reason,
      },
    });

    try {
      await this.notificationsService.sendToUser(
        referral.referringPractitionerId,
        'REFERRAL_DECLINED',
        'Referral Declined',
        `Your referral was declined. Reason: ${dto.reason}`,
        NotificationChannel.IN_APP,
        { referralId: id },
      );
    } catch (err) {
      this.logger.warn(`Failed to send referral decline notification: ${err}`);
    }

    return updated;
  }

  async complete(userId: string, id: string, dto: CompleteReferralDto) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    // Either practitioner can complete
    if (
      referral.referringPractitionerId !== userId &&
      referral.referredPractitionerId !== userId
    ) {
      throw new ForbiddenException('Only involved practitioners can complete this referral');
    }

    const allowedStatuses: ReferralStatus[] = [
      ReferralStatus.ACCEPTED,
      ReferralStatus.APPOINTMENT_BOOKED,
    ];
    if (!allowedStatuses.includes(referral.status)) {
      throw new BadRequestException(`Cannot complete referral with status ${referral.status}`);
    }

    const updated = await this.prisma.referral.update({
      where: { id },
      data: {
        status: ReferralStatus.COMPLETED,
        completedAt: new Date(),
        dischargeNotes: dto.dischargeNotes,
      },
    });

    try {
      await this.notificationsService.sendToUser(
        referral.patientId,
        'REFERRAL_COMPLETED',
        'Referral Completed',
        'Your referral has been completed',
        NotificationChannel.IN_APP,
        { referralId: id },
      );
    } catch (err) {
      this.logger.warn(`Failed to send referral complete notification: ${err}`);
    }

    return updated;
  }

  async cancel(userId: string, id: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Referral not found');

    if (referral.referringPractitionerId !== userId) {
      throw new ForbiddenException('Only the referring practitioner can cancel this referral');
    }

    const terminalStatuses: ReferralStatus[] = [
      ReferralStatus.COMPLETED,
      ReferralStatus.DECLINED,
      ReferralStatus.CANCELLED,
    ];
    if (terminalStatuses.includes(referral.status)) {
      throw new BadRequestException(`Cannot cancel referral with status ${referral.status}`);
    }

    const updated = await this.prisma.referral.update({
      where: { id },
      data: { status: ReferralStatus.CANCELLED, cancelledAt: new Date() },
    });

    // Notify patient and referred practitioner
    try {
      await this.notificationsService.sendToUser(
        referral.patientId,
        'REFERRAL_CANCELLED',
        'Referral Cancelled',
        'Your referral has been cancelled',
        NotificationChannel.IN_APP,
        { referralId: id },
      );
      if (referral.referredPractitionerId) {
        await this.notificationsService.sendToUser(
          referral.referredPractitionerId,
          'REFERRAL_CANCELLED',
          'Referral Cancelled',
          'A referral assigned to you has been cancelled',
          NotificationChannel.IN_APP,
          { referralId: id },
        );
      }
    } catch (err) {
      this.logger.warn(`Failed to send referral cancel notifications: ${err}`);
    }

    return updated;
  }
}
