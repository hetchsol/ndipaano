import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  UserQueryDto,
  AnalyticsPeriodDto,
  CreatePharmacyDto,
  UpdatePharmacyDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Platform dashboard stats.
   */
  async getDashboard() {
    const [
      totalUsers,
      usersByRole,
      totalBookings,
      bookingsByStatus,
      revenueResult,
      payoutsResult,
      activePractitioners,
      pendingVerifications,
      recentBookings,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      this.prisma.booking.count(),
      this.prisma.booking.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', paidOutAt: { not: null } },
        _sum: { practitionerPayout: true },
      }),
      this.prisma.practitionerProfile.count({
        where: { isAvailable: true },
      }),
      this.prisma.practitionerProfile.count({
        where: { hpczVerified: false },
      }),
      this.prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          practitioner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const usersByRoleMap = usersByRole.reduce(
      (acc, item) => {
        acc[item.role] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    const bookingsByStatusMap = bookingsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalUsers,
      usersByRole: usersByRoleMap,
      totalBookings,
      bookingsByStatus: bookingsByStatusMap,
      totalRevenue: revenueResult._sum.amount || 0,
      totalPayouts: payoutsResult._sum.practitionerPayout || 0,
      activePractitioners,
      pendingVerifications,
      recentBookings,
    };
  }

  /**
   * List all users with pagination, role filter, search by name/email.
   */
  async getUsers(query: UserQueryDto) {
    const { role, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
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
   * Get user with full profile by ID.
   */
  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        patientProfile: {
          include: {
            familyMembers: true,
          },
        },
        practitionerProfile: {
          include: {
            documents: true,
          },
        },
        consentRecords: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        emergencyContacts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, twoFactorSecret, ...result } = user;
    return result;
  }

  /**
   * Toggle user active status.
   */
  async toggleUserActive(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    return {
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: updated,
    };
  }

  /**
   * Revenue analytics by period.
   */
  async getPlatformAnalytics(query: AnalyticsPeriodDto) {
    const { period, startDate, endDate } = query;

    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date = endDate ? new Date(endDate) : now;

    if (startDate) {
      dateFrom = new Date(startDate);
    } else {
      switch (period) {
        case 'daily':
          dateFrom = new Date(now);
          dateFrom.setDate(now.getDate() - 30);
          break;
        case 'weekly':
          dateFrom = new Date(now);
          dateFrom.setDate(now.getDate() - 12 * 7);
          break;
        case 'monthly':
          dateFrom = new Date(now);
          dateFrom.setMonth(now.getMonth() - 12);
          break;
      }
    }

    const paymentWhere: Prisma.PaymentWhereInput = {
      status: 'COMPLETED',
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    const bookingWhere: Prisma.BookingWhereInput = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    const [
      totalBookings,
      totalRevenueResult,
      topPractitioners,
      serviceTypeBreakdown,
    ] = await Promise.all([
      this.prisma.booking.count({ where: bookingWhere }),
      this.prisma.payment.aggregate({
        where: paymentWhere,
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['practitionerId'],
        where: paymentWhere,
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),
      this.prisma.booking.groupBy({
        by: ['serviceType'],
        where: bookingWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    // Fetch practitioner details for top practitioners
    const practitionerIds = topPractitioners.map((p) => p.practitionerId);
    const practitioners = await this.prisma.user.findMany({
      where: { id: { in: practitionerIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const practitionerMap = new Map(practitioners.map((p) => [p.id, p]));

    const topPractitionersWithDetails = topPractitioners.map((p) => ({
      practitioner: practitionerMap.get(p.practitionerId) || {
        id: p.practitionerId,
      },
      totalRevenue: p._sum.amount || 0,
      bookingsCount: p._count.id,
    }));

    const popularServiceTypes = serviceTypeBreakdown.map((s) => ({
      serviceType: s.serviceType,
      count: s._count.id,
    }));

    return {
      period,
      dateRange: { from: dateFrom, to: dateTo },
      totalBookings,
      totalRevenue: totalRevenueResult._sum.amount || 0,
      averageBookingValue: totalRevenueResult._avg.amount || 0,
      topPractitioners: topPractitionersWithDetails,
      popularServiceTypes,
    };
  }

  /**
   * List practitioners pending HPCZ verification with documents.
   */
  async getVerificationQueue(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.practitionerProfile.findMany({
        where: { hpczVerified: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              createdAt: true,
            },
          },
          documents: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.practitionerProfile.count({
        where: { hpczVerified: false },
      }),
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
   * List pharmacies with pagination.
   */
  async getPharmacies(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PharmacyWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { zamraRegistration: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.pharmacy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pharmacy.count({ where }),
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
   * Register a new pharmacy.
   */
  async createPharmacy(dto: CreatePharmacyDto) {
    const existing = await this.prisma.pharmacy.findUnique({
      where: { zamraRegistration: dto.zamraRegistration },
    });

    if (existing) {
      throw new BadRequestException(
        `A pharmacy with ZAMRA registration "${dto.zamraRegistration}" already exists`,
      );
    }

    return this.prisma.pharmacy.create({
      data: {
        name: dto.name,
        zamraRegistration: dto.zamraRegistration,
        address: dto.address,
        city: dto.city,
        province: dto.province,
        latitude: dto.latitude,
        longitude: dto.longitude,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  /**
   * Update pharmacy details.
   */
  async updatePharmacy(id: string, dto: UpdatePharmacyDto) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id },
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    // If ZAMRA registration is being changed, check uniqueness
    if (dto.zamraRegistration && dto.zamraRegistration !== pharmacy.zamraRegistration) {
      const existing = await this.prisma.pharmacy.findUnique({
        where: { zamraRegistration: dto.zamraRegistration },
      });
      if (existing) {
        throw new BadRequestException(
          `A pharmacy with ZAMRA registration "${dto.zamraRegistration}" already exists`,
        );
      }
    }

    return this.prisma.pharmacy.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.zamraRegistration !== undefined && {
          zamraRegistration: dto.zamraRegistration,
        }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });
  }

  /**
   * Activate or deactivate a pharmacy.
   */
  async togglePharmacyActive(id: string, isActive: boolean) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id },
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const updated = await this.prisma.pharmacy.update({
      where: { id },
      data: { isActive },
    });

    return {
      message: `Pharmacy ${isActive ? 'activated' : 'deactivated'} successfully`,
      pharmacy: updated,
    };
  }

  // ===========================================================================
  // Pharmacy Inventory
  // ===========================================================================

  async getPharmacyInventory(
    pharmacyId: string,
    query: { page?: number; limit?: number; search?: string },
  ) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PharmacyInventoryWhereInput = { pharmacyId };
    if (query.search) {
      where.OR = [
        { medicationName: { contains: query.search, mode: 'insensitive' } },
        { genericName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.pharmacyInventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { medicationName: 'asc' },
      }),
      this.prisma.pharmacyInventory.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createInventoryItem(pharmacyId: string, dto: CreateInventoryItemDto) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found');
    }

    const existing = await this.prisma.pharmacyInventory.findUnique({
      where: {
        pharmacyId_medicationName: {
          pharmacyId,
          medicationName: dto.medicationName,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Inventory item "${dto.medicationName}" already exists for this pharmacy`,
      );
    }

    return this.prisma.pharmacyInventory.create({
      data: {
        pharmacyId,
        medicationName: dto.medicationName,
        genericName: dto.genericName,
        unitPrice: dto.unitPrice,
        quantityInStock: dto.quantityInStock ?? 0,
      },
    });
  }

  async updateInventoryItem(
    pharmacyId: string,
    itemId: string,
    dto: UpdateInventoryItemDto,
  ) {
    const item = await this.prisma.pharmacyInventory.findFirst({
      where: { id: itemId, pharmacyId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return this.prisma.pharmacyInventory.update({
      where: { id: itemId },
      data: {
        ...(dto.medicationName !== undefined && { medicationName: dto.medicationName }),
        ...(dto.genericName !== undefined && { genericName: dto.genericName }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
        ...(dto.quantityInStock !== undefined && { quantityInStock: dto.quantityInStock }),
      },
    });
  }

  async deleteInventoryItem(pharmacyId: string, itemId: string) {
    const item = await this.prisma.pharmacyInventory.findFirst({
      where: { id: itemId, pharmacyId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    await this.prisma.pharmacyInventory.delete({ where: { id: itemId } });
    return { message: 'Inventory item deleted successfully' };
  }
}
