import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentType } from '@prisma/client';
import {
  AuditLogQueryDto,
  ProcessDataRequestDto,
  CreateBreachNotificationDto,
  UpdateBreachNotificationDto,
  BreachQueryDto,
} from './dto/compliance.dto';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List audit logs with pagination and filters. ADMIN only.
   */
  async getAuditLogs(query: AuditLogQueryDto) {
    const { userId, action, resourceType, startDate, endDate, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single audit log by ID.
   */
  async getAuditLogById(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return log;
  }

  /**
   * Create a consent record for a user.
   */
  async createConsentRecord(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.consentRecord.create({
      data: {
        userId,
        consentType,
        granted,
        grantedAt: granted ? new Date() : null,
        revokedAt: !granted ? new Date() : null,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Get all consent records for a user.
   */
  async getUserConsents(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.consentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update consent - revoke or re-grant.
   * If revoking, set revokedAt on the existing active record.
   * If granting again, create a new record.
   */
  async updateConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!granted) {
      // Revoking consent: find the most recent active consent of this type and revoke it
      const activeConsent = await this.prisma.consentRecord.findFirst({
        where: {
          userId,
          consentType,
          granted: true,
          revokedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!activeConsent) {
        throw new BadRequestException(
          `No active ${consentType} consent found to revoke`,
        );
      }

      return this.prisma.consentRecord.update({
        where: { id: activeConsent.id },
        data: {
          granted: false,
          revokedAt: new Date(),
        },
      });
    }

    // Granting consent: create a new consent record
    return this.prisma.consentRecord.create({
      data: {
        userId,
        consentType,
        granted: true,
        grantedAt: new Date(),
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Check if a user has active consent of a given type.
   */
  async checkConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const activeConsent = await this.prisma.consentRecord.findFirst({
      where: {
        userId,
        consentType,
        granted: true,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return !!activeConsent;
  }

  /**
   * List all data subject requests (ADMIN). Paginated with status filter.
   */
  async getDataSubjectRequests(query: { page?: number; limit?: number; status?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.dataSubjectRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.dataSubjectRequest.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Process a data subject request - update status, set processedBy, response, completedAt.
   */
  async processDataSubjectRequest(
    requestId: string,
    adminUserId: string,
    dto: ProcessDataRequestDto,
  ) {
    const request = await this.prisma.dataSubjectRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Data subject request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot process request with status "${request.status}". Only PENDING requests can be processed.`,
      );
    }

    return this.prisma.dataSubjectRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        processedBy: adminUserId,
        response: dto.response,
        completedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Create a breach notification record (ADMIN/SUPER_ADMIN).
   */
  async createBreachNotification(dto: CreateBreachNotificationDto, reportedBy?: string) {
    return this.prisma.breachNotification.create({
      data: {
        detectedAt: new Date(),
        description: dto.description,
        affectedUsersCount: dto.affectedUsersCount,
        severity: dto.severity,
        remediationSteps: dto.remediationSteps,
        reportedBy,
      },
    });
  }

  /**
   * List breach notifications (ADMIN).
   */
  async getBreachNotifications(query: BreachQueryDto) {
    const { page, limit, severity } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (severity) {
      where.severity = severity;
    }

    const [data, total] = await Promise.all([
      this.prisma.breachNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.breachNotification.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a breach notification (mark commissioner notified, add remediation steps).
   */
  async updateBreachNotification(id: string, dto: UpdateBreachNotificationDto) {
    const breach = await this.prisma.breachNotification.findUnique({
      where: { id },
    });

    if (!breach) {
      throw new NotFoundException('Breach notification not found');
    }

    const data: any = {};
    if (dto.commissionerNotified !== undefined) {
      data.commissionerNotified = dto.commissionerNotified;
    }
    if (dto.remediationSteps !== undefined) {
      data.remediationSteps = dto.remediationSteps;
    }
    if (dto.reportedAt !== undefined) {
      data.reportedAt = new Date(dto.reportedAt);
    }

    return this.prisma.breachNotification.update({
      where: { id },
      data,
    });
  }

  /**
   * Return compliance dashboard stats.
   */
  async getComplianceDashboard() {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      auditLogsToday,
      auditLogsWeek,
      auditLogsMonth,
      auditLogsTotal,
      pendingDataRequests,
      activeConsents,
      pendingVerifications,
    ] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startOfWeek } },
      }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.auditLog.count(),
      this.prisma.dataSubjectRequest.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.consentRecord.groupBy({
        by: ['consentType'],
        where: {
          granted: true,
          revokedAt: null,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.practitionerProfile.count({
        where: { hpczVerified: false },
      }),
    ]);

    const activeConsentsBreakdown = activeConsents.reduce(
      (acc, item) => {
        acc[item.consentType] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      auditLogs: {
        today: auditLogsToday,
        thisWeek: auditLogsWeek,
        thisMonth: auditLogsMonth,
        total: auditLogsTotal,
      },
      pendingDataRequests,
      activeConsentsBreakdown,
      pendingVerifications,
    };
  }
}
