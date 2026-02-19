import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationChannel } from '@prisma/client';

interface ReminderJobData {
  bookingId: string;
  reminderId: string;
}

@Processor('scheduling')
export class SchedulingProcessor {
  private readonly logger = new Logger(SchedulingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Process('reminder-24h')
  async handleReminder24h(job: Job<ReminderJobData>) {
    this.logger.log(
      `Processing 24h reminder for booking ${job.data.bookingId}`,
    );
    await this.sendReminder(job.data, '24 hours');
  }

  @Process('reminder-1h')
  async handleReminder1h(job: Job<ReminderJobData>) {
    this.logger.log(
      `Processing 1h reminder for booking ${job.data.bookingId}`,
    );
    await this.sendReminder(job.data, '1 hour');
  }

  /**
   * Shared logic for processing a reminder job.
   * Loads the booking details, marks the reminder as sent, and sends
   * notifications to both the patient and practitioner.
   */
  private async sendReminder(
    data: ReminderJobData,
    timeLabel: string,
  ): Promise<void> {
    const { bookingId, reminderId } = data;

    // Load the reminder record
    const reminder = await this.prisma.bookingReminder.findUnique({
      where: { id: reminderId },
    });

    if (!reminder) {
      this.logger.warn(`Reminder ${reminderId} not found, skipping`);
      return;
    }

    if (reminder.sent) {
      this.logger.warn(`Reminder ${reminderId} already sent, skipping`);
      return;
    }

    // Load the booking with patient and practitioner details
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        practitioner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found, skipping reminder`);
      return;
    }

    // Mark the reminder as sent
    await this.prisma.bookingReminder.update({
      where: { id: reminderId },
      data: { sent: true },
    });

    const scheduledTime = new Date(booking.scheduledAt).toLocaleString();
    const serviceLabel = booking.serviceType
      .replace(/_/g, ' ')
      .toLowerCase();

    // Send notification to the patient
    try {
      await this.notificationsService.sendToUser(
        booking.patientId,
        'BOOKING_REMINDER',
        `Appointment in ${timeLabel}`,
        `Your ${serviceLabel} appointment with ${booking.practitioner.firstName} ${booking.practitioner.lastName} is in ${timeLabel} (${scheduledTime}).`,
        NotificationChannel.PUSH,
        { bookingId, reminderType: timeLabel },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send patient reminder for booking ${bookingId}: ${(error as Error).message}`,
      );
    }

    // Send notification to the practitioner
    try {
      await this.notificationsService.sendToUser(
        booking.practitionerId,
        'BOOKING_REMINDER',
        `Appointment in ${timeLabel}`,
        `Your ${serviceLabel} appointment with ${booking.patient.firstName} ${booking.patient.lastName} is in ${timeLabel} (${scheduledTime}).`,
        NotificationChannel.PUSH,
        { bookingId, reminderType: timeLabel },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send practitioner reminder for booking ${bookingId}: ${(error as Error).message}`,
      );
    }

    this.logger.log(
      `Reminder ${reminderId} (${timeLabel}) sent for booking ${bookingId}`,
    );
  }
}
