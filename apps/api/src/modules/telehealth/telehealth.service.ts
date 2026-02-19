import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTelehealthSessionDto, RecordConsentDto } from './dto/telehealth.dto';
import { BookingStatus, ServiceType, ConsentType } from '@prisma/client';

@Injectable()
export class TelehealthService {
  private readonly logger = new Logger(TelehealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Create Telehealth Session
  // ---------------------------------------------------------------------------

  async createSession(practitionerId: string, dto: CreateTelehealthSessionDto) {
    // Validate booking exists
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: {
        id: true,
        patientId: true,
        practitionerId: true,
        status: true,
        serviceType: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify the booking is CONFIRMED
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Booking must be in CONFIRMED status to create a telehealth session',
      );
    }

    // Verify the booking is for a VIRTUAL_CONSULTATION
    if (booking.serviceType !== ServiceType.VIRTUAL_CONSULTATION) {
      throw new BadRequestException(
        'Telehealth sessions can only be created for VIRTUAL_CONSULTATION bookings',
      );
    }

    // Verify the practitioner matches
    if (booking.practitionerId !== practitionerId) {
      throw new ForbiddenException(
        'You are not the practitioner assigned to this booking',
      );
    }

    // Check if a session already exists for this booking
    const existing = await this.prisma.telehealthSession.findUnique({
      where: { bookingId: dto.bookingId },
    });

    if (existing) {
      return existing;
    }

    const session = await this.prisma.telehealthSession.create({
      data: {
        bookingId: dto.bookingId,
        status: 'WAITING',
      },
    });

    this.logger.log(
      `Telehealth session ${session.id} created for booking ${dto.bookingId}`,
    );

    return session;
  }

  // ---------------------------------------------------------------------------
  // Get Single Session
  // ---------------------------------------------------------------------------

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        booking: {
          include: {
            patient: {
              select: { id: true, firstName: true, lastName: true },
            },
            practitioner: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Telehealth session not found');
    }

    // Verify the user is a participant (patient or practitioner on the booking)
    if (
      session.booking.patientId !== userId &&
      session.booking.practitionerId !== userId
    ) {
      throw new ForbiddenException(
        'You are not a participant in this telehealth session',
      );
    }

    return session;
  }

  // ---------------------------------------------------------------------------
  // Start Session
  // ---------------------------------------------------------------------------

  async startSession(userId: string, sessionId: string) {
    const session = await this.prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        booking: {
          select: { id: true, patientId: true, practitionerId: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Telehealth session not found');
    }

    // Verify the user is the practitioner on the booking
    if (session.booking.practitionerId !== userId) {
      throw new ForbiddenException(
        'Only the assigned practitioner can start the session',
      );
    }

    // Verify the session is in WAITING status
    if (session.status !== 'WAITING') {
      throw new BadRequestException(
        `Session cannot be started from ${session.status} status`,
      );
    }

    const updatedSession = await this.prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
      },
    });

    this.logger.log(`Telehealth session ${sessionId} started by practitioner ${userId}`);

    return updatedSession;
  }

  // ---------------------------------------------------------------------------
  // End Session
  // ---------------------------------------------------------------------------

  async endSession(
    userId: string,
    sessionId: string,
    dto?: { practitionerNotes?: string },
  ) {
    const session = await this.prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        booking: {
          select: { id: true, patientId: true, practitionerId: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Telehealth session not found');
    }

    // Verify the user is a participant
    if (
      session.booking.patientId !== userId &&
      session.booking.practitionerId !== userId
    ) {
      throw new ForbiddenException(
        'You are not a participant in this telehealth session',
      );
    }

    const now = new Date();
    let durationMinutes: number | null = null;

    if (session.startedAt) {
      durationMinutes = Math.round(
        (now.getTime() - session.startedAt.getTime()) / 60000,
      );
    }

    const updatedSession = await this.prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        status: 'ENDED',
        endedAt: now,
        endedBy: userId,
        durationMinutes,
        ...(dto?.practitionerNotes && {
          practitionerNotes: dto.practitionerNotes,
        }),
      },
    });

    this.logger.log(
      `Telehealth session ${sessionId} ended by user ${userId} (duration: ${durationMinutes} min)`,
    );

    return updatedSession;
  }

  // ---------------------------------------------------------------------------
  // Record Consent
  // ---------------------------------------------------------------------------

  async recordConsent(
    userId: string,
    sessionId: string,
    dto: RecordConsentDto,
  ) {
    const session = await this.prisma.telehealthSession.findUnique({
      where: { id: sessionId },
      include: {
        booking: {
          select: { id: true, patientId: true, practitionerId: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Telehealth session not found');
    }

    // Verify the user is the patient on the booking
    if (session.booking.patientId !== userId) {
      throw new ForbiddenException(
        'Only the patient can record telehealth recording consent',
      );
    }

    // Update recording consent on the session
    const updatedSession = await this.prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        recordingConsent: dto.recordingConsent,
      },
    });

    // Also create a ConsentRecord
    await this.prisma.consentRecord.create({
      data: {
        userId,
        consentType: ConsentType.TELEHEALTH_RECORDING,
        granted: dto.recordingConsent,
        grantedAt: dto.recordingConsent ? new Date() : null,
        revokedAt: !dto.recordingConsent ? new Date() : null,
      },
    });

    this.logger.log(
      `Recording consent ${dto.recordingConsent ? 'granted' : 'revoked'} for session ${sessionId} by patient ${userId}`,
    );

    return updatedSession;
  }

  // ---------------------------------------------------------------------------
  // Get Sessions By User (Paginated)
  // ---------------------------------------------------------------------------

  async getSessionsByUser(
    userId: string,
    params: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where = {
      booking: {
        OR: [{ patientId: userId }, { practitionerId: userId }],
      },
    };

    const [sessions, total] = await Promise.all([
      this.prisma.telehealthSession.findMany({
        where,
        include: {
          booking: {
            include: {
              patient: {
                select: { id: true, firstName: true, lastName: true },
              },
              practitioner: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.telehealthSession.count({ where }),
    ]);

    return {
      data: sessions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
