import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, UserRole } from '@prisma/client';
import {
  CreateBookingDto,
  BookingQueryDto,
} from './dto/booking.dto';
import { SchedulingService } from '../scheduling/scheduling.service';
import { ChatService } from '../chat/chat.service';

/**
 * Practitioner roles from the Prisma UserRole enum.
 * Used to validate that the target user is actually a practitioner.
 */
const PRACTITIONER_ROLES: UserRole[] = [
  UserRole.NURSE,
  UserRole.CLINICAL_OFFICER,
  UserRole.DOCTOR,
  UserRole.PHYSIOTHERAPIST,
  UserRole.PHARMACIST,
];

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(SchedulingService) private readonly schedulingService?: SchedulingService,
    @Optional() @Inject(ChatService) private readonly chatService?: ChatService,
  ) {}

  // ===========================================================================
  // Create Booking
  // ===========================================================================

  /**
   * Create a new booking with status PENDING (requested).
   * Validates that the practitioner exists, is verified, is available,
   * and has no scheduling conflicts within a 1-hour window.
   */
  async create(patientUserId: string, dto: CreateBookingDto) {
    const scheduledAt = new Date(dto.scheduledAt);

    // Validate the scheduled time is in the future
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // Validate practitioner exists and is a practitioner role
    const practitioner = await this.prisma.user.findUnique({
      where: { id: dto.practitionerId },
      include: { practitionerProfile: true },
    });

    if (!practitioner) {
      throw new NotFoundException('Practitioner not found');
    }

    if (!PRACTITIONER_ROLES.includes(practitioner.role)) {
      throw new BadRequestException('The specified user is not a practitioner');
    }

    if (!practitioner.practitionerProfile) {
      throw new BadRequestException('Practitioner profile not found');
    }

    // Verify practitioner is HPCZ verified
    if (!practitioner.practitionerProfile.hpczVerified) {
      throw new BadRequestException(
        'Practitioner is not yet verified. Only verified practitioners can accept bookings.',
      );
    }

    // Verify practitioner is marked as available
    if (!practitioner.practitionerProfile.isAvailable) {
      throw new BadRequestException(
        'Practitioner is currently not available for bookings',
      );
    }

    // Prevent booking yourself
    if (patientUserId === dto.practitionerId) {
      throw new BadRequestException('You cannot book yourself');
    }

    // Validate slot availability via scheduling service if available
    if (this.schedulingService) {
      try {
        await this.schedulingService.validateSlotAvailability(dto.practitionerId, scheduledAt);
      } catch (error) {
        throw error;
      }
    } else {
      // Fallback: Check for scheduling conflicts within a 1-hour window
      const oneHourBefore = new Date(scheduledAt.getTime() - 60 * 60 * 1000);
      const oneHourAfter = new Date(scheduledAt.getTime() + 60 * 60 * 1000);

      const conflictingBooking = await this.prisma.booking.findFirst({
        where: {
          practitionerId: dto.practitionerId,
          scheduledAt: {
            gte: oneHourBefore,
            lte: oneHourAfter,
          },
          status: {
            in: [
              BookingStatus.PENDING,
              BookingStatus.CONFIRMED,
              BookingStatus.PRACTITIONER_EN_ROUTE,
              BookingStatus.IN_PROGRESS,
            ],
          },
        },
      });

      if (conflictingBooking) {
        throw new ConflictException(
          'The practitioner has a scheduling conflict within the requested time window. ' +
          'Please select a different time at least 1 hour apart from existing bookings.',
        );
      }
    }

    // Calculate scheduled end time from practitioner profile settings
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId: dto.practitionerId },
      select: { slotDurationMinutes: true },
    });
    const slotDuration = profile?.slotDurationMinutes || 60;
    const scheduledEndTime = new Date(scheduledAt.getTime() + slotDuration * 60 * 1000);

    // Create the booking with PENDING (requested) status
    const booking = await this.prisma.booking.create({
      data: {
        patientId: patientUserId,
        practitionerId: dto.practitionerId,
        serviceType: dto.serviceType,
        status: BookingStatus.PENDING,
        scheduledAt,
        scheduledEndTime,
        address: dto.address,
        city: dto.city,
        province: dto.province,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        notes: dto.notes,
      },
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
            phone: true,
            practitionerProfile: {
              select: {
                practitionerType: true,
                specializations: true,
                ratingAvg: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Booking ${booking.id} created by patient ${patientUserId} for practitioner ${dto.practitionerId}`,
    );

    return booking;
  }

  // ===========================================================================
  // Find by ID
  // ===========================================================================

  /**
   * Get a booking by ID with full patient and practitioner details.
   */
  async findById(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            patientProfile: {
              select: {
                dateOfBirth: true,
                gender: true,
                bloodType: true,
                allergiesJson: true,
                address: true,
                city: true,
                province: true,
              },
            },
          },
        },
        practitioner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            practitionerProfile: {
              select: {
                practitionerType: true,
                specializations: true,
                bio: true,
                ratingAvg: true,
                ratingCount: true,
                baseConsultationFee: true,
              },
            },
          },
        },
        tracking: true,
        review: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  // ===========================================================================
  // Find by Patient
  // ===========================================================================

  /**
   * List all bookings for a patient with pagination and optional filtering.
   */
  async findByPatient(patientUserId: string, query: BookingQueryDto) {
    const { status, page = 1, limit = 20, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = { patientId: patientUserId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: {
          practitioner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              practitionerProfile: {
                select: {
                  practitionerType: true,
                  ratingAvg: true,
                },
              },
            },
          },
          tracking: true,
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ===========================================================================
  // Find by Practitioner
  // ===========================================================================

  /**
   * List all bookings for a practitioner with pagination and optional filtering.
   */
  async findByPractitioner(practitionerUserId: string, query: BookingQueryDto) {
    const { status, page = 1, limit = 20, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = { practitionerId: practitionerUserId };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate);
      if (endDate) where.scheduledAt.lte = new Date(endDate);
    }

    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              patientProfile: {
                select: {
                  dateOfBirth: true,
                  gender: true,
                  address: true,
                  city: true,
                },
              },
            },
          },
          tracking: true,
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ===========================================================================
  // Accept Booking
  // ===========================================================================

  /**
   * Accept a booking. Transitions PENDING -> CONFIRMED.
   * Only the assigned practitioner can accept.
   */
  async accept(bookingId: string, practitionerUserId: string) {
    const booking = await this.findBookingOrThrow(bookingId);

    this.verifyPractitionerOwnership(booking, practitionerUserId);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Cannot accept booking with status "${booking.status}". Only PENDING bookings can be accepted.`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(
      `Booking ${bookingId} accepted by practitioner ${practitionerUserId}`,
    );

    // Create chat conversation for this booking
    if (this.chatService) {
      try {
        await this.chatService.createConversation(
          bookingId,
          booking.patientId,
          booking.practitionerId,
        );
        this.logger.log(`Chat conversation created for booking ${bookingId}`);
      } catch (error) {
        this.logger.warn(`Failed to create chat conversation for booking ${bookingId}: ${(error as Error).message}`);
      }
    }

    // Create reminders
    if (this.schedulingService) {
      try {
        await this.schedulingService.createReminders(bookingId, booking.scheduledAt);
      } catch (error) {
        this.logger.warn(`Failed to create reminders for booking ${bookingId}: ${(error as Error).message}`);
      }
    }

    return updated;
  }

  // ===========================================================================
  // Reject Booking
  // ===========================================================================

  /**
   * Reject a booking. Transitions PENDING -> CANCELLED with a reason.
   * Only the assigned practitioner can reject.
   */
  async reject(
    bookingId: string,
    practitionerUserId: string,
    reason?: string,
  ) {
    const booking = await this.findBookingOrThrow(bookingId);

    this.verifyPractitionerOwnership(booking, practitionerUserId);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject booking with status "${booking.status}". Only PENDING bookings can be rejected.`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: reason || 'Rejected by practitioner',
        cancelledBy: practitionerUserId,
        cancelledAt: new Date(),
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(
      `Booking ${bookingId} rejected by practitioner ${practitionerUserId}`,
    );

    return updated;
  }

  // ===========================================================================
  // En Route
  // ===========================================================================

  /**
   * Mark practitioner as en route. Transitions CONFIRMED -> PRACTITIONER_EN_ROUTE.
   * Only the assigned practitioner can trigger this.
   */
  async enRoute(bookingId: string, practitionerUserId: string) {
    const booking = await this.findBookingOrThrow(bookingId);

    this.verifyPractitionerOwnership(booking, practitionerUserId);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot mark en route for booking with status "${booking.status}". Only CONFIRMED bookings can be marked en route.`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.PRACTITIONER_EN_ROUTE },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(
      `Booking ${bookingId}: practitioner ${practitionerUserId} is en route`,
    );

    // Send system message to chat
    await this.sendBookingSystemMessage(bookingId, 'Practitioner is on the way to your location.');

    return updated;
  }

  // ===========================================================================
  // Start Visit
  // ===========================================================================

  /**
   * Start a visit. Transitions CONFIRMED -> IN_PROGRESS, sets startedAt.
   * Also creates an initial BookingTracking record.
   * Only the assigned practitioner can start.
   */
  async startVisit(bookingId: string, practitionerUserId: string) {
    const booking = await this.findBookingOrThrow(bookingId);

    this.verifyPractitionerOwnership(booking, practitionerUserId);

    if (
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.PRACTITIONER_EN_ROUTE
    ) {
      throw new BadRequestException(
        `Cannot start visit for booking with status "${booking.status}". ` +
        'Only CONFIRMED or PRACTITIONER_EN_ROUTE bookings can be started.',
      );
    }

    // Use a transaction to update booking and create tracking record atomically
    const [updated] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          practitioner: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.bookingTracking.upsert({
        where: { bookingId },
        create: {
          bookingId,
          practitionerLat: booking.locationLat ?? 0,
          practitionerLng: booking.locationLng ?? 0,
        },
        update: {},
      }),
    ]);

    this.logger.log(
      `Booking ${bookingId}: visit started by practitioner ${practitionerUserId}`,
    );

    await this.sendBookingSystemMessage(bookingId, 'The medical visit has started.');

    return updated;
  }

  // ===========================================================================
  // Complete Visit
  // ===========================================================================

  /**
   * Complete a visit. Transitions IN_PROGRESS -> COMPLETED, sets completedAt.
   * Only the assigned practitioner can complete.
   */
  async complete(bookingId: string, practitionerUserId: string) {
    const booking = await this.findBookingOrThrow(bookingId);

    this.verifyPractitionerOwnership(booking, practitionerUserId);

    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot complete booking with status "${booking.status}". Only IN_PROGRESS bookings can be completed.`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(
      `Booking ${bookingId}: visit completed by practitioner ${practitionerUserId}`,
    );

    await this.sendBookingSystemMessage(bookingId, 'The visit has been completed. Thank you!');

    return updated;
  }

  // ===========================================================================
  // Cancel Booking
  // ===========================================================================

  /**
   * Cancel a booking. Either the patient or the practitioner can cancel.
   * If the booking is CONFIRMED or IN_PROGRESS, a reason is required.
   * Sets cancelledAt, cancelledBy, and cancellationReason.
   */
  async cancel(bookingId: string, userId: string, reason?: string) {
    const booking = await this.findBookingOrThrow(bookingId);

    // Verify the user is either the patient or the practitioner
    if (booking.patientId !== userId && booking.practitionerId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to cancel this booking',
      );
    }

    // Cannot cancel bookings that are already completed or cancelled
    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel booking with status "${booking.status}"`,
      );
    }

    // Require a reason for cancelling confirmed or in-progress bookings
    if (
      (booking.status === BookingStatus.CONFIRMED ||
        booking.status === BookingStatus.IN_PROGRESS ||
        booking.status === BookingStatus.PRACTITIONER_EN_ROUTE) &&
      !reason
    ) {
      throw new BadRequestException(
        'A cancellation reason is required for confirmed or in-progress bookings',
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: reason || null,
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    this.logger.log(
      `Booking ${bookingId} cancelled by user ${userId}. Reason: ${reason || 'N/A'}`,
    );

    // Cancel reminders
    if (this.schedulingService) {
      try {
        await this.schedulingService.cancelReminders(bookingId);
      } catch (error) {
        this.logger.warn(`Failed to cancel reminders for booking ${bookingId}: ${(error as Error).message}`);
      }
    }

    await this.sendBookingSystemMessage(bookingId, `Booking has been cancelled.${reason ? ` Reason: ${reason}` : ''}`);

    return updated;
  }

  // ===========================================================================
  // Get Upcoming Bookings
  // ===========================================================================

  /**
   * Get the next 5 upcoming bookings for a user based on their role.
   * Returns bookings scheduled in the future with an active status.
   */
  async getUpcoming(userId: string, role: UserRole) {
    const isPractitioner = PRACTITIONER_ROLES.includes(role);

    const where: any = {
      scheduledAt: { gte: new Date() },
      status: {
        in: [
          BookingStatus.PENDING,
          BookingStatus.CONFIRMED,
          BookingStatus.PRACTITIONER_EN_ROUTE,
          BookingStatus.IN_PROGRESS,
        ],
      },
    };

    if (isPractitioner) {
      where.practitionerId = userId;
    } else {
      where.patientId = userId;
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        practitioner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            practitionerProfile: {
              select: {
                practitionerType: true,
                ratingAvg: true,
              },
            },
          },
        },
        tracking: true,
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    });

    return bookings;
  }

  // ===========================================================================
  // Get Practitioner Stats
  // ===========================================================================

  /**
   * Get booking statistics for a practitioner:
   * total bookings, completed, cancelled, and average rating.
   */
  async getStats(practitionerUserId: string) {
    const [total, completed, cancelled, ratingResult] =
      await this.prisma.$transaction([
        this.prisma.booking.count({
          where: { practitionerId: practitionerUserId },
        }),
        this.prisma.booking.count({
          where: {
            practitionerId: practitionerUserId,
            status: BookingStatus.COMPLETED,
          },
        }),
        this.prisma.booking.count({
          where: {
            practitionerId: practitionerUserId,
            status: BookingStatus.CANCELLED,
          },
        }),
        this.prisma.review.aggregate({
          where: { practitionerId: practitionerUserId },
          _avg: { rating: true },
          _count: { rating: true },
        }),
      ]);

    return {
      total,
      completed,
      cancelled,
      averageRating: ratingResult._avg.rating ?? 0,
      totalReviews: ratingResult._count.rating,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Fetch a booking by ID or throw NotFoundException.
   */
  private async findBookingOrThrow(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    return booking;
  }

  /**
   * Verify that the given user is the assigned practitioner for the booking.
   */
  private verifyPractitionerOwnership(
    booking: { practitionerId: string },
    practitionerUserId: string,
  ) {
    if (booking.practitionerId !== practitionerUserId) {
      throw new ForbiddenException(
        'You are not the assigned practitioner for this booking',
      );
    }
  }

  /**
   * Send a system message to the chat conversation associated with a booking.
   */
  private async sendBookingSystemMessage(bookingId: string, content: string) {
    if (!this.chatService) return;
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { bookingId },
      });
      if (conversation) {
        await this.chatService.sendSystemMessage(conversation.id, content);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to send system message for booking ${bookingId}: ${(error as Error).message}`,
      );
    }
  }
}
