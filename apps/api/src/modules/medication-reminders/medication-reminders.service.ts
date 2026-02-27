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
  ReminderFrequency,
  MedicationReminderStatus,
  AdherenceStatus,
} from '@prisma/client';
import {
  CreateMedicationReminderDto,
  UpdateMedicationReminderDto,
  LogAdherenceDto,
  MedicationReminderQueryDto,
  AdherenceSummaryQueryDto,
} from './dto/medication-reminder.dto';

@Injectable()
export class MedicationRemindersService {
  private readonly logger = new Logger(MedicationRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ===========================================================================
  // Create Reminder
  // ===========================================================================

  async createReminder(patientUserId: string, dto: CreateMedicationReminderDto) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: dto.prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }
    if (prescription.patientId !== patientUserId) {
      throw new ForbiddenException('This prescription does not belong to you');
    }
    if (!prescription.dispensed) {
      throw new BadRequestException('Reminders can only be created for dispensed prescriptions');
    }

    const reminder = await this.prisma.medicationReminder.create({
      data: {
        prescriptionId: dto.prescriptionId,
        patientId: patientUserId,
        frequency: dto.frequency,
        timesOfDay: dto.timesOfDay,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        notifyVia: dto.notifyVia,
        missedWindowMinutes: dto.missedWindowMinutes ?? 120,
        totalQuantity: prescription.quantity,
      },
      include: {
        prescription: {
          select: {
            id: true,
            medicationName: true,
            dosage: true,
            frequency: true,
          },
        },
      },
    });

    this.logger.log(`Medication reminder created: ${reminder.id} for patient ${patientUserId}`);
    return reminder;
  }

  // ===========================================================================
  // Auto-create reminders on dispense/deliver
  // ===========================================================================

  async autoCreateReminders(prescriptionId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      this.logger.warn(`autoCreateReminders: prescription ${prescriptionId} not found`);
      return;
    }

    // Check if a reminder already exists for this prescription
    const existing = await this.prisma.medicationReminder.findFirst({
      where: { prescriptionId },
    });
    if (existing) {
      this.logger.log(`Reminder already exists for prescription ${prescriptionId}, skipping auto-create`);
      return;
    }

    // Parse frequency
    const { frequency, timesOfDay } = this.parseFrequency(prescription.frequency);

    // Parse duration for endDate
    const startDate = new Date();
    const endDate = this.parseEndDate(prescription.duration, startDate);

    const reminder = await this.prisma.medicationReminder.create({
      data: {
        prescriptionId,
        patientId: prescription.patientId,
        frequency,
        timesOfDay,
        startDate,
        endDate,
        notifyVia: [NotificationChannel.IN_APP],
        totalQuantity: prescription.quantity,
        missedWindowMinutes: 120,
      },
    });

    this.logger.log(`Auto-created medication reminder ${reminder.id} for prescription ${prescriptionId}`);

    // Notify the patient
    try {
      await this.notificationsService.send({
        userId: prescription.patientId,
        type: 'MEDICATION_REMINDER_CREATED',
        title: 'Medication Reminder Set Up',
        body: `A reminder has been automatically created for ${prescription.medicationName} (${prescription.dosage}). You can customize the schedule in your Reminders page.`,
        channel: NotificationChannel.IN_APP,
        metadata: { reminderId: reminder.id, prescriptionId },
      });
    } catch (err) {
      this.logger.warn(`Failed to send auto-reminder notification: ${err}`);
    }

    return reminder;
  }

  private parseFrequency(freqText: string): {
    frequency: ReminderFrequency;
    timesOfDay: string[];
  } {
    const lower = freqText.toLowerCase();

    if (lower.includes('three times') || lower.includes('3 times') || lower.includes('tds') || lower.includes('tid')) {
      return { frequency: ReminderFrequency.THREE_TIMES_DAILY, timesOfDay: ['08:00', '14:00', '20:00'] };
    }
    if (lower.includes('four times') || lower.includes('4 times') || lower.includes('qds') || lower.includes('qid')) {
      return { frequency: ReminderFrequency.FOUR_TIMES_DAILY, timesOfDay: ['08:00', '12:00', '16:00', '20:00'] };
    }
    if (lower.includes('twice') || lower.includes('two times') || lower.includes('2 times') || lower.includes('bd') || lower.includes('bid')) {
      return { frequency: ReminderFrequency.TWICE_DAILY, timesOfDay: ['08:00', '20:00'] };
    }
    if (lower.includes('every other day') || lower.includes('alternate day')) {
      return { frequency: ReminderFrequency.EVERY_OTHER_DAY, timesOfDay: ['08:00'] };
    }
    if (lower.includes('weekly') || lower.includes('once a week')) {
      return { frequency: ReminderFrequency.WEEKLY, timesOfDay: ['08:00'] };
    }
    // Default: once daily
    return { frequency: ReminderFrequency.ONCE_DAILY, timesOfDay: ['08:00'] };
  }

  private parseEndDate(duration: string | null, startDate: Date): Date {
    if (!duration) {
      return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const lower = duration.toLowerCase();
    const numMatch = lower.match(/(\d+)/);
    const num = numMatch ? parseInt(numMatch[1]) : 1;

    if (lower.includes('month')) {
      return new Date(startDate.getTime() + num * 30 * 24 * 60 * 60 * 1000);
    }
    if (lower.includes('week')) {
      return new Date(startDate.getTime() + num * 7 * 24 * 60 * 60 * 1000);
    }
    if (lower.includes('day')) {
      return new Date(startDate.getTime() + num * 24 * 60 * 60 * 1000);
    }
    if (lower.includes('year')) {
      return new Date(startDate.getTime() + num * 365 * 24 * 60 * 60 * 1000);
    }

    // Default: 30 days
    return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  // ===========================================================================
  // Update / Status transitions
  // ===========================================================================

  async updateReminder(patientUserId: string, id: string, dto: UpdateMedicationReminderDto) {
    const reminder = await this.prisma.medicationReminder.findUnique({ where: { id } });
    if (!reminder) throw new NotFoundException('Medication reminder not found');
    if (reminder.patientId !== patientUserId) {
      throw new ForbiddenException('This reminder does not belong to you');
    }

    const data: Prisma.MedicationReminderUpdateInput = {};
    if (dto.timesOfDay) data.timesOfDay = dto.timesOfDay;
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.notifyVia) data.notifyVia = dto.notifyVia;
    if (dto.missedWindowMinutes !== undefined) data.missedWindowMinutes = dto.missedWindowMinutes;
    if (dto.status) data.status = dto.status;

    return this.prisma.medicationReminder.update({
      where: { id },
      data,
      include: {
        prescription: {
          select: { id: true, medicationName: true, dosage: true, frequency: true },
        },
      },
    });
  }

  async pauseReminder(patientUserId: string, id: string) {
    const reminder = await this.prisma.medicationReminder.findUnique({ where: { id } });
    if (!reminder) throw new NotFoundException('Medication reminder not found');
    if (reminder.patientId !== patientUserId) throw new ForbiddenException('This reminder does not belong to you');
    if (reminder.status !== MedicationReminderStatus.ACTIVE) {
      throw new BadRequestException(`Cannot pause reminder with status ${reminder.status}`);
    }

    return this.prisma.medicationReminder.update({
      where: { id },
      data: { status: MedicationReminderStatus.PAUSED },
    });
  }

  async resumeReminder(patientUserId: string, id: string) {
    const reminder = await this.prisma.medicationReminder.findUnique({ where: { id } });
    if (!reminder) throw new NotFoundException('Medication reminder not found');
    if (reminder.patientId !== patientUserId) throw new ForbiddenException('This reminder does not belong to you');
    if (reminder.status !== MedicationReminderStatus.PAUSED) {
      throw new BadRequestException(`Cannot resume reminder with status ${reminder.status}`);
    }

    return this.prisma.medicationReminder.update({
      where: { id },
      data: { status: MedicationReminderStatus.ACTIVE },
    });
  }

  async cancelReminder(patientUserId: string, id: string) {
    const reminder = await this.prisma.medicationReminder.findUnique({ where: { id } });
    if (!reminder) throw new NotFoundException('Medication reminder not found');
    if (reminder.patientId !== patientUserId) throw new ForbiddenException('This reminder does not belong to you');
    if (reminder.status === MedicationReminderStatus.CANCELLED) {
      throw new BadRequestException('Reminder is already cancelled');
    }

    return this.prisma.medicationReminder.update({
      where: { id },
      data: { status: MedicationReminderStatus.CANCELLED },
    });
  }

  // ===========================================================================
  // Read operations
  // ===========================================================================

  async getReminders(patientUserId: string, query: MedicationReminderQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MedicationReminderWhereInput = { patientId: patientUserId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.medicationReminder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          prescription: {
            select: {
              id: true,
              medicationName: true,
              dosage: true,
              frequency: true,
              practitioner: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      this.prisma.medicationReminder.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getReminderById(patientUserId: string, id: string) {
    const reminder = await this.prisma.medicationReminder.findUnique({
      where: { id },
      include: {
        prescription: {
          select: {
            id: true,
            medicationName: true,
            dosage: true,
            frequency: true,
            duration: true,
            quantity: true,
            practitioner: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        adherenceLogs: {
          orderBy: { scheduledAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!reminder) throw new NotFoundException('Medication reminder not found');
    if (reminder.patientId !== patientUserId) {
      throw new ForbiddenException('This reminder does not belong to you');
    }

    return reminder;
  }

  // ===========================================================================
  // Adherence logging
  // ===========================================================================

  async logAdherence(patientUserId: string, dto: LogAdherenceDto) {
    if (dto.status !== AdherenceStatus.TAKEN && dto.status !== AdherenceStatus.SKIPPED) {
      throw new BadRequestException('Status must be TAKEN or SKIPPED');
    }

    const log = await this.prisma.adherenceLog.findUnique({
      where: { id: dto.adherenceLogId },
      include: { reminder: true },
    });

    if (!log) throw new NotFoundException('Adherence log not found');
    if (log.patientId !== patientUserId) {
      throw new ForbiddenException('This adherence log does not belong to you');
    }
    if (log.status !== AdherenceStatus.PENDING) {
      throw new BadRequestException(`Cannot update log with status ${log.status}`);
    }

    return this.prisma.adherenceLog.update({
      where: { id: dto.adherenceLogId },
      data: {
        status: dto.status,
        respondedAt: new Date(),
        reason: dto.reason,
      },
    });
  }

  // ===========================================================================
  // Today's reminders
  // ===========================================================================

  async getTodaysReminders(patientUserId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const logs = await this.prisma.adherenceLog.findMany({
      where: {
        patientId: patientUserId,
        scheduledAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        reminder: {
          include: {
            prescription: {
              select: {
                id: true,
                medicationName: true,
                dosage: true,
                frequency: true,
              },
            },
          },
        },
      },
    });

    return logs;
  }

  // ===========================================================================
  // Adherence summary / compliance
  // ===========================================================================

  async getAdherenceSummary(patientUserId: string, query: AdherenceSummaryQueryDto) {
    const where: Prisma.AdherenceLogWhereInput = {
      patientId: patientUserId,
    };

    if (query.prescriptionId) {
      where.reminder = { prescriptionId: query.prescriptionId };
    }
    if (query.startDate || query.endDate) {
      where.scheduledAt = {};
      if (query.startDate) (where.scheduledAt as any).gte = new Date(query.startDate);
      if (query.endDate) (where.scheduledAt as any).lte = new Date(query.endDate);
    }

    const logs = await this.prisma.adherenceLog.findMany({
      where,
      include: {
        reminder: {
          include: {
            prescription: {
              select: { id: true, medicationName: true, dosage: true },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Overall compliance
    const nonPending = logs.filter((l) => l.status !== AdherenceStatus.PENDING);
    const taken = nonPending.filter((l) => l.status === AdherenceStatus.TAKEN);
    const overallCompliance = nonPending.length > 0
      ? Math.round((taken.length / nonPending.length) * 100)
      : 0;

    // Streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedNonPending = [...nonPending].sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
    );
    for (const log of sortedNonPending) {
      if (log.status === AdherenceStatus.TAKEN) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }
    // Current streak: count from most recent backwards
    for (let i = sortedNonPending.length - 1; i >= 0; i--) {
      if (sortedNonPending[i].status === AdherenceStatus.TAKEN) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Per-medication breakdown
    const byMedication = new Map<
      string,
      { medicationName: string; dosage: string; total: number; taken: number }
    >();
    for (const log of nonPending) {
      const key = log.reminder.prescriptionId;
      if (!byMedication.has(key)) {
        byMedication.set(key, {
          medicationName: log.reminder.prescription.medicationName,
          dosage: log.reminder.prescription.dosage,
          total: 0,
          taken: 0,
        });
      }
      const entry = byMedication.get(key)!;
      entry.total++;
      if (log.status === AdherenceStatus.TAKEN) entry.taken++;
    }

    const perMedication = Array.from(byMedication.values()).map((m) => ({
      ...m,
      compliance: m.total > 0 ? Math.round((m.taken / m.total) * 100) : 0,
    }));

    // Weekly trend (last 7 days)
    const weeklyTrend: { date: string; taken: number; total: number; compliance: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLogs = nonPending.filter((l) => {
        const logDate = l.scheduledAt.toISOString().split('T')[0];
        return logDate === dateStr;
      });
      const dayTaken = dayLogs.filter((l) => l.status === AdherenceStatus.TAKEN).length;
      weeklyTrend.push({
        date: dateStr,
        taken: dayTaken,
        total: dayLogs.length,
        compliance: dayLogs.length > 0 ? Math.round((dayTaken / dayLogs.length) * 100) : 0,
      });
    }

    return {
      overallCompliance,
      currentStreak,
      longestStreak,
      totalDoses: nonPending.length,
      dosesTaken: taken.length,
      dosesMissed: nonPending.filter((l) => l.status === AdherenceStatus.MISSED).length,
      dosesSkipped: nonPending.filter((l) => l.status === AdherenceStatus.SKIPPED).length,
      perMedication,
      weeklyTrend,
    };
  }

  // ===========================================================================
  // Refill status
  // ===========================================================================

  async getRefillStatus(patientUserId: string, reminderId: string) {
    const reminder = await this.prisma.medicationReminder.findUnique({
      where: { id: reminderId },
      include: {
        prescription: {
          select: { id: true, medicationName: true, dosage: true, quantity: true },
        },
      },
    });

    if (!reminder) throw new NotFoundException('Medication reminder not found');
    if (reminder.patientId !== patientUserId) {
      throw new ForbiddenException('This reminder does not belong to you');
    }

    const totalQuantity = reminder.totalQuantity || reminder.prescription.quantity || 0;

    // Count doses taken
    const takenCount = await this.prisma.adherenceLog.count({
      where: {
        reminderId,
        status: AdherenceStatus.TAKEN,
      },
    });

    const remaining = Math.max(0, totalQuantity - takenCount);
    const dosesPerDay = reminder.timesOfDay.length;
    const estimatedDaysRemaining = dosesPerDay > 0 ? Math.floor(remaining / dosesPerDay) : 0;
    const needsRefillSoon = estimatedDaysRemaining <= 7;

    return {
      medicationName: reminder.prescription.medicationName,
      dosage: reminder.prescription.dosage,
      totalQuantity,
      dosesTaken: takenCount,
      remaining,
      dosesPerDay,
      estimatedDaysRemaining,
      needsRefillSoon,
    };
  }

  // ===========================================================================
  // Practitioner: view patient adherence
  // ===========================================================================

  async getPatientAdherence(practitionerId: string, patientId: string) {
    // Verify practitioner has treated this patient (has prescribed to them)
    const hasRelationship = await this.prisma.prescription.findFirst({
      where: {
        practitionerId,
        patientId,
      },
    });

    if (!hasRelationship) {
      throw new ForbiddenException('You do not have a treatment relationship with this patient');
    }

    // Get patient info
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    // Get summary
    const summary = await this.getAdherenceSummary(patientId, {});

    // Get active reminders
    const reminders = await this.prisma.medicationReminder.findMany({
      where: { patientId, status: MedicationReminderStatus.ACTIVE },
      include: {
        prescription: {
          select: { id: true, medicationName: true, dosage: true, frequency: true },
        },
      },
    });

    // Recent logs
    const recentLogs = await this.prisma.adherenceLog.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      take: 20,
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

    return {
      patient,
      summary,
      activeReminders: reminders,
      recentLogs,
    };
  }
}
