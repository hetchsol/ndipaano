import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { DayOfWeek, BookingStatus, ReminderType } from '@prisma/client';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  BulkAvailabilityDto,
} from './dto/availability.dto';
import {
  CreateBlackoutDto,
  BlackoutQueryDto,
  RescheduleBookingDto,
  UpdateSchedulingSettingsDto,
} from './dto/scheduling.dto';

/**
 * Maps JavaScript Date.getDay() (0 = Sunday .. 6 = Saturday) to the Prisma DayOfWeek enum.
 */
const DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

/**
 * Active booking statuses that block a time slot from being available.
 */
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.PRACTITIONER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
];

interface TimeSlot {
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  available: boolean;
}

export interface DaySlots {
  date: string; // YYYY-MM-DD
  slots: TimeSlot[];
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  availableSlots: number;
  totalSlots: number;
  isBlackout: boolean;
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('scheduling') private readonly schedulingQueue: Queue,
  ) {}

  // ===========================================================================
  // Availability CRUD
  // ===========================================================================

  /**
   * Get all availability records for a practitioner.
   */
  async getAvailability(practitionerId: string) {
    return this.prisma.practitionerAvailability.findMany({
      where: { practitionerId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Create a single availability slot for a practitioner.
   * Validates that endTime is after startTime.
   */
  async createAvailability(
    practitionerId: string,
    dto: CreateAvailabilityDto,
  ) {
    this.validateTimeRange(dto.startTime, dto.endTime);

    return this.prisma.practitionerAvailability.create({
      data: {
        practitionerId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Update an existing availability slot.
   * Verifies the record belongs to the practitioner before updating.
   */
  async updateAvailability(
    practitionerId: string,
    id: string,
    dto: UpdateAvailabilityDto,
  ) {
    const availability = await this.prisma.practitionerAvailability.findUnique({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException(`Availability record ${id} not found`);
    }

    if (availability.practitionerId !== practitionerId) {
      throw new ForbiddenException(
        'You do not own this availability record',
      );
    }

    // If updating times, validate the resulting range
    const newStart = dto.startTime ?? availability.startTime;
    const newEnd = dto.endTime ?? availability.endTime;
    this.validateTimeRange(newStart, newEnd);

    return this.prisma.practitionerAvailability.update({
      where: { id },
      data: {
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Delete a single availability slot.
   * Verifies ownership before deletion.
   */
  async deleteAvailability(practitionerId: string, id: string) {
    const availability = await this.prisma.practitionerAvailability.findUnique({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException(`Availability record ${id} not found`);
    }

    if (availability.practitionerId !== practitionerId) {
      throw new ForbiddenException(
        'You do not own this availability record',
      );
    }

    await this.prisma.practitionerAvailability.delete({ where: { id } });

    return { message: 'Availability record deleted successfully' };
  }

  /**
   * Replace all availability slots for a practitioner in a single transaction.
   * Deletes all existing records and creates the new ones.
   */
  async setBulkAvailability(
    practitionerId: string,
    dto: BulkAvailabilityDto,
  ) {
    // Validate every slot
    for (const slot of dto.slots) {
      this.validateTimeRange(slot.startTime, slot.endTime);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Delete all existing availability for this practitioner
      await tx.practitionerAvailability.deleteMany({
        where: { practitionerId },
      });

      // Create all new slots
      const created = await Promise.all(
        dto.slots.map((slot) =>
          tx.practitionerAvailability.create({
            data: {
              practitionerId,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isActive: slot.isActive ?? true,
            },
          }),
        ),
      );

      return created;
    });

    this.logger.log(
      `Bulk availability set for practitioner ${practitionerId}: ${result.length} slot(s)`,
    );

    return result;
  }

  // ===========================================================================
  // Blackouts CRUD
  // ===========================================================================

  /**
   * Get blackout periods for a practitioner, optionally filtered by date range.
   */
  async getBlackouts(practitionerId: string, query?: BlackoutQueryDto) {
    const where: any = { practitionerId };

    if (query?.startDate || query?.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    return this.prisma.practitionerBlackout.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Create a new blackout period for a practitioner.
   */
  async createBlackout(practitionerId: string, dto: CreateBlackoutDto) {
    if (dto.startTime && dto.endTime) {
      this.validateTimeRange(dto.startTime, dto.endTime);
    }

    return this.prisma.practitionerBlackout.create({
      data: {
        practitionerId,
        date: new Date(dto.date),
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        reason: dto.reason ?? null,
      },
    });
  }

  /**
   * Delete a blackout period. Verifies ownership before deletion.
   */
  async deleteBlackout(practitionerId: string, id: string) {
    const blackout = await this.prisma.practitionerBlackout.findUnique({
      where: { id },
    });

    if (!blackout) {
      throw new NotFoundException(`Blackout record ${id} not found`);
    }

    if (blackout.practitionerId !== practitionerId) {
      throw new ForbiddenException('You do not own this blackout record');
    }

    await this.prisma.practitionerBlackout.delete({ where: { id } });

    return { message: 'Blackout record deleted successfully' };
  }

  // ===========================================================================
  // Available Slots (Core Algorithm)
  // ===========================================================================

  /**
   * Core scheduling algorithm. For a given date range, computes which time slots
   * are available for booking with a practitioner.
   *
   * Steps:
   * 1. Load practitioner profile for slotDurationMinutes + bufferMinutes
   * 2. Load weekly availability windows
   * 3. Load blackout periods that overlap the range
   * 4. Load existing active bookings in the range
   * 5. For each date: generate slots from availability windows, subtract blackouts
   *    and existing bookings, return available + unavailable slots.
   */
  async getAvailableSlots(
    practitionerId: string,
    startDate: string,
    endDate: string,
  ): Promise<DaySlots[]> {
    // 1. Get practitioner profile for scheduling settings
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId: practitionerId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    const slotDuration = profile.slotDurationMinutes;
    const buffer = profile.bufferMinutes;

    // 2. Get weekly availability
    const availabilities = await this.prisma.practitionerAvailability.findMany({
      where: { practitionerId, isActive: true },
    });

    // 3. Get blackouts in range
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);

    const blackouts = await this.prisma.practitionerBlackout.findMany({
      where: {
        practitionerId,
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
    });

    // 4. Get existing active bookings in range
    const bookingRangeStart = new Date(startDate + 'T00:00:00.000Z');
    const bookingRangeEnd = new Date(endDate + 'T23:59:59.999Z');

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        practitionerId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        scheduledAt: {
          gte: bookingRangeStart,
          lte: bookingRangeEnd,
        },
      },
      select: {
        scheduledAt: true,
        scheduledEndTime: true,
      },
    });

    // 5. Build day-by-day slot list
    const result: DaySlots[] = [];
    const current = new Date(rangeStart);

    while (current <= rangeEnd) {
      const dateStr = this.formatDate(current);
      const dayOfWeek = DAY_MAP[current.getDay()];

      // Get availability windows for this day of week
      const dayAvailabilities = availabilities.filter(
        (a) => a.dayOfWeek === dayOfWeek,
      );

      // Get blackouts for this specific date
      const dayBlackouts = blackouts.filter(
        (b) => this.formatDate(b.date) === dateStr,
      );

      // Check if the entire day is blacked out (full-day blackout)
      const isFullDayBlackout = dayBlackouts.some(
        (b) => !b.startTime && !b.endTime,
      );

      const slots: TimeSlot[] = [];

      if (!isFullDayBlackout && dayAvailabilities.length > 0) {
        for (const avail of dayAvailabilities) {
          // Parse availability window
          const windowStart = this.parseTimeToDate(dateStr, avail.startTime);
          const windowEnd = this.parseTimeToDate(dateStr, avail.endTime);

          // Generate slots within this window
          let slotStart = new Date(windowStart);

          while (slotStart.getTime() + slotDuration * 60 * 1000 <= windowEnd.getTime()) {
            const slotEnd = new Date(
              slotStart.getTime() + slotDuration * 60 * 1000,
            );

            // Check if slot is blacked out (partial blackout)
            const isBlackedOut = dayBlackouts.some((b) => {
              if (!b.startTime || !b.endTime) return false; // full-day already handled
              const blackoutStart = this.parseTimeToDate(dateStr, b.startTime);
              const blackoutEnd = this.parseTimeToDate(dateStr, b.endTime);
              return slotStart < blackoutEnd && slotEnd > blackoutStart;
            });

            // Check if slot conflicts with an existing booking
            const hasConflict = existingBookings.some((booking) => {
              const bookingStart = new Date(booking.scheduledAt);
              const bookingEnd = booking.scheduledEndTime
                ? new Date(booking.scheduledEndTime)
                : new Date(bookingStart.getTime() + slotDuration * 60 * 1000);
              return slotStart < bookingEnd && slotEnd > bookingStart;
            });

            slots.push({
              startTime: slotStart.toISOString(),
              endTime: slotEnd.toISOString(),
              available: !isBlackedOut && !hasConflict,
            });

            // Move to next slot: slotDuration + buffer
            slotStart = new Date(
              slotStart.getTime() + (slotDuration + buffer) * 60 * 1000,
            );
          }
        }
      }

      result.push({ date: dateStr, slots });

      // Advance to next day
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  // ===========================================================================
  // Calendar View
  // ===========================================================================

  /**
   * Build a calendar view for a given month. Returns an array of CalendarDay
   * objects with slot counts and blackout status.
   */
  async getCalendarView(
    practitionerId: string,
    year: number,
    month: number,
  ): Promise<CalendarDay[]> {
    // First and last day of the month
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0)); // day 0 of next month = last day of this month

    const startDate = this.formatDate(firstDay);
    const endDate = this.formatDate(lastDay);

    // Reuse the getAvailableSlots algorithm
    const daySlots = await this.getAvailableSlots(
      practitionerId,
      startDate,
      endDate,
    );

    // Get blackouts for the month to check full-day blackouts
    const blackouts = await this.prisma.practitionerBlackout.findMany({
      where: {
        practitionerId,
        date: { gte: firstDay, lte: lastDay },
      },
    });

    return daySlots.map((day) => {
      const dayBlackouts = blackouts.filter(
        (b) => this.formatDate(b.date) === day.date,
      );
      const isFullDayBlackout = dayBlackouts.some(
        (b) => !b.startTime && !b.endTime,
      );

      return {
        date: day.date,
        availableSlots: day.slots.filter((s) => s.available).length,
        totalSlots: day.slots.length,
        isBlackout: isFullDayBlackout,
      };
    });
  }

  // ===========================================================================
  // Slot Validation
  // ===========================================================================

  /**
   * Validate that a specific datetime is available for booking with a practitioner.
   * Checks availability windows, blackouts, and booking conflicts.
   * Throws BadRequestException or ConflictException if not available.
   */
  async validateSlotAvailability(
    practitionerId: string,
    scheduledAt: Date,
  ): Promise<void> {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId: practitionerId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    const slotDuration = profile.slotDurationMinutes;
    const dayOfWeek = DAY_MAP[scheduledAt.getDay()];
    const timeStr = this.formatTime(scheduledAt);
    const dateStr = this.formatDate(scheduledAt);

    // Check that the time falls within an active availability window
    const availabilities = await this.prisma.practitionerAvailability.findMany({
      where: {
        practitionerId,
        dayOfWeek,
        isActive: true,
      },
    });

    const slotEnd = new Date(
      scheduledAt.getTime() + slotDuration * 60 * 1000,
    );
    const slotEndStr = this.formatTime(slotEnd);

    const withinWindow = availabilities.some(
      (a) => timeStr >= a.startTime && slotEndStr <= a.endTime,
    );

    if (!withinWindow) {
      throw new BadRequestException(
        'The requested time is outside the practitioner\'s availability window',
      );
    }

    // Check blackouts
    const blackouts = await this.prisma.practitionerBlackout.findMany({
      where: {
        practitionerId,
        date: new Date(dateStr),
      },
    });

    for (const blackout of blackouts) {
      // Full-day blackout
      if (!blackout.startTime && !blackout.endTime) {
        throw new BadRequestException(
          'The practitioner is unavailable on this date (blackout)',
        );
      }
      // Partial blackout
      if (blackout.startTime && blackout.endTime) {
        if (timeStr < blackout.endTime && slotEndStr > blackout.startTime) {
          throw new BadRequestException(
            'The requested time overlaps with a blackout period',
          );
        }
      }
    }

    // Check booking conflicts
    const conflicting = await this.prisma.booking.findFirst({
      where: {
        practitionerId,
        status: { in: ACTIVE_BOOKING_STATUSES },
        scheduledAt: { lt: slotEnd },
        OR: [
          {
            scheduledEndTime: { gt: scheduledAt },
          },
          {
            scheduledEndTime: null,
            scheduledAt: {
              gt: new Date(scheduledAt.getTime() - slotDuration * 60 * 1000),
            },
          },
        ],
      },
    });

    if (conflicting) {
      throw new ConflictException(
        'The requested time conflicts with an existing booking',
      );
    }
  }

  // ===========================================================================
  // Reschedule Booking
  // ===========================================================================

  /**
   * Reschedule an existing booking to a new time.
   * Validates the booking state, user participation, and new slot availability.
   */
  async rescheduleBooking(
    bookingId: string,
    userId: string,
    dto: RescheduleBookingDto,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // User must be either the patient or practitioner
    if (booking.patientId !== userId && booking.practitionerId !== userId) {
      throw new ForbiddenException(
        'You are not a participant of this booking',
      );
    }

    // Only PENDING or CONFIRMED bookings can be rescheduled
    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        `Cannot reschedule booking with status "${booking.status}". Only PENDING or CONFIRMED bookings can be rescheduled.`,
      );
    }

    const newScheduledAt = new Date(dto.scheduledAt);

    if (newScheduledAt <= new Date()) {
      throw new BadRequestException(
        'The new scheduled time must be in the future',
      );
    }

    // Validate the new slot is available
    await this.validateSlotAvailability(
      booking.practitionerId,
      newScheduledAt,
    );

    // Update booking with reschedule information
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        rescheduledFrom: booking.scheduledAt,
        scheduledAt: newScheduledAt,
        rescheduledAt: new Date(),
        rescheduledBy: userId,
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
          },
        },
      },
    });

    this.logger.log(
      `Booking ${bookingId} rescheduled by user ${userId} from ${booking.scheduledAt.toISOString()} to ${newScheduledAt.toISOString()}`,
    );

    return updated;
  }

  // ===========================================================================
  // Scheduling Settings
  // ===========================================================================

  /**
   * Get the scheduling settings (slot duration and buffer) for a practitioner.
   */
  async getSettings(practitionerId: string) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId: practitionerId },
      select: {
        slotDurationMinutes: true,
        bufferMinutes: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    return profile;
  }

  /**
   * Update the scheduling settings for a practitioner.
   */
  async updateSettings(
    practitionerId: string,
    dto: UpdateSchedulingSettingsDto,
  ) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId: practitionerId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    return this.prisma.practitionerProfile.update({
      where: { userId: practitionerId },
      data: {
        ...(dto.slotDurationMinutes !== undefined && {
          slotDurationMinutes: dto.slotDurationMinutes,
        }),
        ...(dto.bufferMinutes !== undefined && {
          bufferMinutes: dto.bufferMinutes,
        }),
      },
      select: {
        slotDurationMinutes: true,
        bufferMinutes: true,
      },
    });
  }

  // ===========================================================================
  // Reminders
  // ===========================================================================

  /**
   * Create reminder records and schedule delayed BullMQ jobs for a booking.
   * Creates two reminders: 24 hours before and 1 hour before the appointment.
   */
  async createReminders(bookingId: string, scheduledAt: Date): Promise<void> {
    const now = new Date();

    const reminder24hTime = new Date(
      scheduledAt.getTime() - 24 * 60 * 60 * 1000,
    );
    const reminder1hTime = new Date(
      scheduledAt.getTime() - 1 * 60 * 60 * 1000,
    );

    // Create 24h reminder if it's still in the future
    if (reminder24hTime > now) {
      const reminder24h = await this.prisma.bookingReminder.create({
        data: {
          bookingId,
          reminderType: ReminderType.TWENTY_FOUR_HOURS,
          scheduledFor: reminder24hTime,
        },
      });

      const job24h = await this.schedulingQueue.add(
        'reminder-24h',
        { bookingId, reminderId: reminder24h.id },
        { delay: reminder24hTime.getTime() - now.getTime() },
      );

      await this.prisma.bookingReminder.update({
        where: { id: reminder24h.id },
        data: { jobId: String(job24h.id) },
      });

      this.logger.log(
        `Created 24h reminder ${reminder24h.id} for booking ${bookingId}, scheduled for ${reminder24hTime.toISOString()}`,
      );
    }

    // Create 1h reminder if it's still in the future
    if (reminder1hTime > now) {
      const reminder1h = await this.prisma.bookingReminder.create({
        data: {
          bookingId,
          reminderType: ReminderType.ONE_HOUR,
          scheduledFor: reminder1hTime,
        },
      });

      const job1h = await this.schedulingQueue.add(
        'reminder-1h',
        { bookingId, reminderId: reminder1h.id },
        { delay: reminder1hTime.getTime() - now.getTime() },
      );

      await this.prisma.bookingReminder.update({
        where: { id: reminder1h.id },
        data: { jobId: String(job1h.id) },
      });

      this.logger.log(
        `Created 1h reminder ${reminder1h.id} for booking ${bookingId}, scheduled for ${reminder1hTime.toISOString()}`,
      );
    }
  }

  /**
   * Cancel all pending reminders for a booking.
   * Removes the BullMQ jobs and deletes the reminder records.
   */
  async cancelReminders(bookingId: string): Promise<void> {
    const reminders = await this.prisma.bookingReminder.findMany({
      where: { bookingId, sent: false },
    });

    for (const reminder of reminders) {
      // Remove the BullMQ job if it exists
      if (reminder.jobId) {
        try {
          const job = await this.schedulingQueue.getJob(reminder.jobId);
          if (job) {
            await job.remove();
            this.logger.log(
              `Removed BullMQ job ${reminder.jobId} for reminder ${reminder.id}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to remove BullMQ job ${reminder.jobId}: ${(error as Error).message}`,
          );
        }
      }
    }

    // Delete all unsent reminder records for this booking
    await this.prisma.bookingReminder.deleteMany({
      where: { bookingId, sent: false },
    });

    this.logger.log(`Cancelled all pending reminders for booking ${bookingId}`);
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Validate that endTime is strictly after startTime (HH:mm strings).
   */
  private validateTimeRange(startTime: string, endTime: string): void {
    if (endTime <= startTime) {
      throw new BadRequestException(
        'endTime must be after startTime',
      );
    }
  }

  /**
   * Format a Date as YYYY-MM-DD.
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format a Date as HH:mm.
   */
  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Parse a date string (YYYY-MM-DD) and a time string (HH:mm) into a Date object.
   */
  private parseTimeToDate(dateStr: string, timeStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }
}
