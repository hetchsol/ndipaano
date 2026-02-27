import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AdherenceStatus,
  MedicationReminderStatus,
  NotificationChannel,
} from '@prisma/client';

@Injectable()
export class MedicationRemindersCron {
  private readonly logger = new Logger(MedicationRemindersCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generate daily adherence logs for all ACTIVE reminders.
   * Runs at 00:05 every day.
   */
  @Cron('5 0 * * *')
  async generateDailyAdherenceLogs() {
    this.logger.log('Generating daily adherence logs...');

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const activeReminders = await this.prisma.medicationReminder.findMany({
      where: {
        status: MedicationReminderStatus.ACTIVE,
        startDate: { lte: todayDate },
        OR: [
          { endDate: null },
          { endDate: { gte: todayDate } },
        ],
      },
    });

    let created = 0;
    for (const reminder of activeReminders) {
      // For EVERY_OTHER_DAY: check if today is an "on" day
      if (reminder.frequency === 'EVERY_OTHER_DAY') {
        const startMs = new Date(reminder.startDate).getTime();
        const diffDays = Math.floor((todayDate.getTime() - startMs) / (24 * 60 * 60 * 1000));
        if (diffDays % 2 !== 0) continue;
      }

      // For WEEKLY: check if today matches the start day of week
      if (reminder.frequency === 'WEEKLY') {
        const startDay = new Date(reminder.startDate).getDay();
        if (todayDate.getDay() !== startDay) continue;
      }

      for (const time of reminder.timesOfDay) {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledAt = new Date(todayDate);
        scheduledAt.setHours(hours, minutes, 0, 0);

        try {
          await this.prisma.adherenceLog.create({
            data: {
              reminderId: reminder.id,
              patientId: reminder.patientId,
              scheduledAt,
              status: AdherenceStatus.PENDING,
            },
          });
          created++;
        } catch (err: any) {
          // @@unique constraint violation means entry already exists (idempotent)
          if (err.code === 'P2002') {
            continue;
          }
          this.logger.error(`Error creating adherence log: ${err.message}`);
        }
      }
    }

    this.logger.log(`Generated ${created} adherence logs for ${activeReminders.length} active reminders`);
  }

  /**
   * Send due reminders every 5 minutes.
   * Finds PENDING logs where scheduledAt is within the last 5 minutes.
   */
  @Cron('*/5 * * * *')
  async sendDueReminders() {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const dueLogs = await this.prisma.adherenceLog.findMany({
      where: {
        status: AdherenceStatus.PENDING,
        scheduledAt: { gte: fiveMinAgo, lte: now },
      },
      include: {
        reminder: {
          include: {
            prescription: {
              select: { medicationName: true, dosage: true },
            },
          },
        },
      },
    });

    if (dueLogs.length === 0) return;

    // Group by patient + scheduledAt to combine same-time notifications
    const grouped = new Map<string, typeof dueLogs>();
    for (const log of dueLogs) {
      const key = `${log.patientId}_${log.scheduledAt.getTime()}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(log);
    }

    for (const [, logs] of grouped) {
      const patientId = logs[0].patientId;
      const medications = logs
        .map((l) => `${l.reminder.prescription.medicationName} ${l.reminder.prescription.dosage}`)
        .join(', ');

      const channels = [...new Set(logs.flatMap((l) => l.reminder.notifyVia))];

      for (const channel of channels) {
        try {
          await this.notificationsService.send({
            userId: patientId,
            type: 'MEDICATION_REMINDER',
            title: 'Time to take your medication',
            body: logs.length === 1
              ? `It's time to take ${medications}`
              : `It's time to take: ${medications}`,
            channel,
            metadata: {
              adherenceLogIds: logs.map((l) => l.id),
            },
          });
        } catch (err) {
          this.logger.warn(`Failed to send medication reminder via ${channel}: ${err}`);
        }
      }
    }

    this.logger.log(`Sent reminders for ${dueLogs.length} due doses`);
  }

  /**
   * Mark missed doses twice per hour.
   * PENDING logs where scheduledAt + missedWindowMinutes < now.
   */
  @Cron('15,45 * * * *')
  async markMissedDoses() {
    const now = new Date();

    const pendingLogs = await this.prisma.adherenceLog.findMany({
      where: {
        status: AdherenceStatus.PENDING,
        scheduledAt: { lt: now },
      },
      include: {
        reminder: {
          select: { missedWindowMinutes: true },
        },
      },
    });

    let missedCount = 0;
    for (const log of pendingLogs) {
      const cutoff = new Date(
        log.scheduledAt.getTime() + log.reminder.missedWindowMinutes * 60 * 1000,
      );
      if (now > cutoff) {
        await this.prisma.adherenceLog.update({
          where: { id: log.id },
          data: { status: AdherenceStatus.MISSED },
        });
        missedCount++;
      }
    }

    if (missedCount > 0) {
      this.logger.log(`Marked ${missedCount} doses as MISSED`);
    }
  }

  /**
   * Check for refill alerts daily at 09:00.
   * For ACTIVE reminders with totalQuantity, send alert if <= 7 days supply remaining.
   */
  @Cron('0 9 * * *')
  async checkRefillAlerts() {
    this.logger.log('Checking refill alerts...');

    const activeReminders = await this.prisma.medicationReminder.findMany({
      where: {
        status: MedicationReminderStatus.ACTIVE,
        totalQuantity: { not: null },
      },
      include: {
        prescription: {
          select: { medicationName: true, dosage: true },
        },
      },
    });

    for (const reminder of activeReminders) {
      const takenCount = await this.prisma.adherenceLog.count({
        where: {
          reminderId: reminder.id,
          status: AdherenceStatus.TAKEN,
        },
      });

      const remaining = Math.max(0, (reminder.totalQuantity || 0) - takenCount);
      const dosesPerDay = reminder.timesOfDay.length;
      const estimatedDays = dosesPerDay > 0 ? Math.floor(remaining / dosesPerDay) : 0;

      if (estimatedDays <= 7 && remaining > 0) {
        try {
          await this.notificationsService.send({
            userId: reminder.patientId,
            type: 'MEDICATION_REFILL_ALERT',
            title: 'Refill Reminder',
            body: `You have approximately ${estimatedDays} day(s) of ${reminder.prescription.medicationName} remaining. Consider ordering a refill.`,
            channel: NotificationChannel.IN_APP,
            metadata: { reminderId: reminder.id },
          });
        } catch (err) {
          this.logger.warn(`Failed to send refill alert: ${err}`);
        }
      }
    }
  }

  /**
   * Complete expired reminders at 23:55 daily.
   * Set ACTIVE reminders past endDate to COMPLETED.
   */
  @Cron('55 23 * * *')
  async completeExpiredReminders() {
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const result = await this.prisma.medicationReminder.updateMany({
      where: {
        status: MedicationReminderStatus.ACTIVE,
        endDate: { lt: todayDate },
      },
      data: { status: MedicationReminderStatus.COMPLETED },
    });

    if (result.count > 0) {
      this.logger.log(`Completed ${result.count} expired medication reminders`);
    }
  }
}
