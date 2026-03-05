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
  CarePlanStatus,
  MilestoneStatus,
  UserRole,
} from '@prisma/client';
import {
  CreateCarePlanDto,
  UpdateCarePlanDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  AddPractitionerDto,
  CarePlanQueryDto,
} from './dto/care-plan.dto';

const PRACTITIONER_PRISMA_ROLES: UserRole[] = [
  UserRole.NURSE,
  UserRole.CLINICAL_OFFICER,
  UserRole.DOCTOR,
  UserRole.PHYSIOTHERAPIST,
  UserRole.PHARMACIST,
];

@Injectable()
export class CarePlansService {
  private readonly logger = new Logger(CarePlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ===========================================================================
  // Create Care Plan
  // ===========================================================================

  async create(creatorId: string, dto: CreateCarePlanDto) {
    // Validate patient exists
    const patient = await this.prisma.user.findUnique({
      where: { id: dto.patientId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new NotFoundException('Patient not found');
    }

    const carePlan = await this.prisma.carePlan.create({
      data: {
        patientId: dto.patientId,
        createdById: creatorId,
        title: dto.title,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        milestones: dto.milestones?.length
          ? {
              create: dto.milestones.map((m) => ({
                title: m.title,
                description: m.description,
                targetDate: m.targetDate ? new Date(m.targetDate) : null,
              })),
            }
          : undefined,
        practitioners: {
          create: {
            practitionerId: creatorId,
            role: 'Creator',
          },
        },
      },
      include: {
        milestones: { orderBy: { targetDate: 'asc' } },
        practitioners: {
          include: {
            practitioner: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.logger.log(`Care plan created: ${carePlan.id} by practitioner ${creatorId}`);

    try {
      await this.notificationsService.sendToUser(
        dto.patientId,
        'CARE_PLAN_CREATED',
        'New Care Plan',
        `A care plan "${dto.title}" has been created for you`,
        NotificationChannel.IN_APP,
        { carePlanId: carePlan.id },
      );
    } catch (err) {
      this.logger.warn(`Failed to send care plan notification: ${err}`);
    }

    return carePlan;
  }

  // ===========================================================================
  // List Care Plans (role-filtered)
  // ===========================================================================

  async findAll(userId: string, role: string, query: CarePlanQueryDto) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CarePlanWhereInput = {};

    if (role === UserRole.PATIENT) {
      where.patientId = userId;
    } else if (PRACTITIONER_PRISMA_ROLES.includes(role as UserRole)) {
      where.OR = [
        { createdById: userId },
        { practitioners: { some: { practitionerId: userId } } },
      ];
    }
    // ADMIN / SUPER_ADMIN see all

    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.carePlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { milestones: true, practitioners: true } },
        },
      }),
      this.prisma.carePlan.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ===========================================================================
  // Get Care Plan by ID
  // ===========================================================================

  async findById(userId: string, role: string, id: string) {
    const carePlan = await this.prisma.carePlan.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        milestones: {
          orderBy: { targetDate: 'asc' },
          include: {
            completedBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        practitioners: {
          include: {
            practitioner: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!carePlan) {
      throw new NotFoundException('Care plan not found');
    }

    // Access check
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    const isPatient = carePlan.patientId === userId;
    const isPractitioner = carePlan.practitioners.some(
      (p) => p.practitionerId === userId,
    );

    if (!isAdmin && !isPatient && !isPractitioner) {
      throw new ForbiddenException('You do not have access to this care plan');
    }

    return carePlan;
  }

  // ===========================================================================
  // Update Care Plan
  // ===========================================================================

  async update(userId: string, id: string, dto: UpdateCarePlanDto) {
    const carePlan = await this.prisma.carePlan.findUnique({
      where: { id },
      include: { practitioners: true },
    });
    if (!carePlan) throw new NotFoundException('Care plan not found');

    const isAssigned = carePlan.practitioners.some(
      (p) => p.practitionerId === userId,
    );
    if (!isAssigned) {
      throw new ForbiddenException('Only the creator or assigned practitioners can update this care plan');
    }

    const data: Prisma.CarePlanUpdateInput = {};
    if (dto.title) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === CarePlanStatus.COMPLETED) {
        data.completedAt = new Date();
      }
    }

    return this.prisma.carePlan.update({
      where: { id },
      data,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        milestones: { orderBy: { targetDate: 'asc' } },
        practitioners: {
          include: {
            practitioner: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  // ===========================================================================
  // Milestones
  // ===========================================================================

  async addMilestone(userId: string, carePlanId: string, dto: CreateMilestoneDto) {
    const carePlan = await this.prisma.carePlan.findUnique({
      where: { id: carePlanId },
      include: { practitioners: true },
    });
    if (!carePlan) throw new NotFoundException('Care plan not found');

    const isAssigned = carePlan.practitioners.some(
      (p) => p.practitionerId === userId,
    );
    if (!isAssigned) {
      throw new ForbiddenException('Only the creator or assigned practitioners can add milestones');
    }

    if (carePlan.status !== CarePlanStatus.ACTIVE) {
      throw new BadRequestException('Can only add milestones to active care plans');
    }

    return this.prisma.carePlanMilestone.create({
      data: {
        carePlanId,
        title: dto.title,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      },
    });
  }

  async updateMilestone(
    userId: string,
    carePlanId: string,
    milestoneId: string,
    dto: UpdateMilestoneDto,
  ) {
    const carePlan = await this.prisma.carePlan.findUnique({
      where: { id: carePlanId },
      include: { practitioners: true },
    });
    if (!carePlan) throw new NotFoundException('Care plan not found');

    const isAssigned = carePlan.practitioners.some(
      (p) => p.practitionerId === userId,
    );
    if (!isAssigned) {
      throw new ForbiddenException('Only the creator or assigned practitioners can update milestones');
    }

    const milestone = await this.prisma.carePlanMilestone.findUnique({
      where: { id: milestoneId },
    });
    if (!milestone || milestone.carePlanId !== carePlanId) {
      throw new NotFoundException('Milestone not found in this care plan');
    }

    const data: Prisma.CarePlanMilestoneUpdateInput = {};
    if (dto.title) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.targetDate !== undefined) data.targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === MilestoneStatus.COMPLETED) {
        data.completedAt = new Date();
        data.completedBy = { connect: { id: userId } };
      }
    }

    const updated = await this.prisma.carePlanMilestone.update({
      where: { id: milestoneId },
      data,
      include: {
        completedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Notify patient on milestone completion
    if (dto.status === MilestoneStatus.COMPLETED) {
      try {
        await this.notificationsService.sendToUser(
          carePlan.patientId,
          'MILESTONE_COMPLETED',
          'Milestone Completed',
          `Milestone "${milestone.title}" in your care plan has been completed`,
          NotificationChannel.IN_APP,
          { carePlanId, milestoneId },
        );
      } catch (err) {
        this.logger.warn(`Failed to send milestone completion notification: ${err}`);
      }
    }

    return updated;
  }

  // ===========================================================================
  // Practitioners
  // ===========================================================================

  async addPractitioner(userId: string, carePlanId: string, dto: AddPractitionerDto) {
    const carePlan = await this.prisma.carePlan.findUnique({
      where: { id: carePlanId },
    });
    if (!carePlan) throw new NotFoundException('Care plan not found');

    if (carePlan.createdById !== userId) {
      throw new ForbiddenException('Only the care plan creator can add practitioners');
    }

    // Validate practitioner exists
    const practitioner = await this.prisma.user.findUnique({
      where: { id: dto.practitionerId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });
    if (!practitioner || !PRACTITIONER_PRISMA_ROLES.includes(practitioner.role as UserRole)) {
      throw new NotFoundException('Practitioner not found');
    }

    try {
      const added = await this.prisma.carePlanPractitioner.create({
        data: {
          carePlanId,
          practitionerId: dto.practitionerId,
          role: dto.role,
        },
        include: {
          practitioner: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      try {
        await this.notificationsService.sendToUser(
          dto.practitionerId,
          'CARE_PLAN_ASSIGNED',
          'Care Plan Assignment',
          `You have been added to a care plan: "${carePlan.title}"`,
          NotificationChannel.IN_APP,
          { carePlanId },
        );
      } catch (err) {
        this.logger.warn(`Failed to send practitioner assignment notification: ${err}`);
      }

      return added;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Practitioner is already assigned to this care plan');
      }
      throw err;
    }
  }

  async removePractitioner(userId: string, carePlanId: string, practitionerId: string) {
    const carePlan = await this.prisma.carePlan.findUnique({
      where: { id: carePlanId },
    });
    if (!carePlan) throw new NotFoundException('Care plan not found');

    if (carePlan.createdById !== userId) {
      throw new ForbiddenException('Only the care plan creator can remove practitioners');
    }

    if (practitionerId === carePlan.createdById) {
      throw new BadRequestException('Cannot remove the care plan creator');
    }

    const assignment = await this.prisma.carePlanPractitioner.findFirst({
      where: { carePlanId, practitionerId },
    });
    if (!assignment) {
      throw new NotFoundException('Practitioner is not assigned to this care plan');
    }

    await this.prisma.carePlanPractitioner.delete({
      where: { id: assignment.id },
    });

    try {
      await this.notificationsService.sendToUser(
        practitionerId,
        'CARE_PLAN_REMOVED',
        'Care Plan Removal',
        `You have been removed from care plan: "${carePlan.title}"`,
        NotificationChannel.IN_APP,
        { carePlanId },
      );
    } catch (err) {
      this.logger.warn(`Failed to send practitioner removal notification: ${err}`);
    }

    return { message: 'Practitioner removed from care plan' };
  }
}
