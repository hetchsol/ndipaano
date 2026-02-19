import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  UpdatePractitionerProfileDto,
  UploadDocumentDto,
  SearchPractitionersDto,
  VerifyDocumentDto,
  UpdateLocationDto,
  CreateOperatingCenterDto,
  UpdateOperatingCenterDto,
} from './dto/practitioner.dto';

@Injectable()
export class PractitionersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the practitioner profile for the given user, including uploaded
   * documents.
   */
  async getProfile(userId: string) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        operatingCenters: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
            languagePreference: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    return profile;
  }

  /**
   * Update practitioner-specific profile fields.
   */
  async updateProfile(userId: string, dto: UpdatePractitionerProfileDto) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    const data: Prisma.PractitionerProfileUpdateInput = {};

    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.specializations !== undefined)
      data.specializations = dto.specializations;
    if (dto.serviceRadiusKm !== undefined)
      data.serviceRadiusKm = dto.serviceRadiusKm;
    if (dto.baseConsultationFee !== undefined)
      data.baseConsultationFee = new Prisma.Decimal(dto.baseConsultationFee);
    if (dto.operatingCenterName !== undefined)
      data.operatingCenterName = dto.operatingCenterName;
    if (dto.operatingCenterAddress !== undefined)
      data.operatingCenterAddress = dto.operatingCenterAddress;
    if (dto.operatingCenterCity !== undefined)
      data.operatingCenterCity = dto.operatingCenterCity;
    if (dto.operatingCenterPhone !== undefined)
      data.operatingCenterPhone = dto.operatingCenterPhone;
    if (dto.offersHomeVisits !== undefined)
      data.offersHomeVisits = dto.offersHomeVisits;
    if (dto.offersClinicVisits !== undefined)
      data.offersClinicVisits = dto.offersClinicVisits;

    // Update language preference on the User record
    if (dto.languagePreference !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { languagePreference: dto.languagePreference },
      });
    }

    const updated = await this.prisma.practitionerProfile.update({
      where: { userId },
      data,
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            languagePreference: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Save document metadata for a practitioner (the actual file upload is
   * handled separately via an upload endpoint/S3 presigned URL).
   */
  async uploadDocument(userId: string, dto: UploadDocumentDto) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    return this.prisma.practitionerDocument.create({
      data: {
        practitionerId: profile.id,
        documentType: dto.documentType,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  /**
   * List all documents for the practitioner.
   */
  async getDocuments(userId: string) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    return this.prisma.practitionerDocument.findMany({
      where: { practitionerId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a document that has not yet been verified. Verified documents
   * cannot be deleted by the practitioner.
   */
  async deleteDocument(userId: string, documentId: string) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    const document = await this.prisma.practitionerDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.practitionerId !== profile.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this document',
      );
    }

    if (document.verified) {
      throw new BadRequestException(
        'Verified documents cannot be deleted. Please contact support.',
      );
    }

    await this.prisma.practitionerDocument.delete({
      where: { id: documentId },
    });

    return { message: 'Document deleted successfully' };
  }

  /**
   * Toggle the practitioner's availability status.
   */
  async toggleAvailability(userId: string, isAvailable: boolean) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    const updated = await this.prisma.practitionerProfile.update({
      where: { userId },
      data: { isAvailable },
    });

    return {
      isAvailable: updated.isAvailable,
      message: updated.isAvailable
        ? 'You are now available for bookings'
        : 'You are now offline',
    };
  }

  /**
   * Update the practitioner's current GPS location.
   */
  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    const updated = await this.prisma.practitionerProfile.update({
      where: { userId },
      data: {
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    return {
      latitude: updated.latitude,
      longitude: updated.longitude,
      message: 'Location updated successfully',
    };
  }

  /**
   * Search for practitioners with various filters. Uses the Haversine formula
   * in raw SQL for distance-based filtering and sorting when coordinates are
   * provided.
   */
  async search(query: SearchPractitionersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    // If lat/lng are provided, use raw SQL with Haversine for distance
    if (
      query.latitude !== undefined &&
      query.longitude !== undefined
    ) {
      return this.searchWithDistance(query, page, limit, offset);
    }

    // Otherwise use standard Prisma query
    return this.searchWithoutDistance(query, page, limit, offset);
  }

  /**
   * Distance-based search using the Haversine formula in raw SQL.
   */
  private async searchWithDistance(
    query: SearchPractitionersDto,
    page: number,
    limit: number,
    offset: number,
  ) {
    const lat = query.latitude!;
    const lng = query.longitude!;
    const radiusKm = query.radiusKm ?? 50;

    // Build WHERE conditions
    const conditions: string[] = [
      'u."isActive" = true',
      'pp.latitude IS NOT NULL',
      'pp.longitude IS NOT NULL',
    ];
    const params: any[] = [lat, lng, radiusKm];
    let paramIndex = 4; // $1=lat, $2=lng, $3=radiusKm

    if (query.practitionerType !== undefined) {
      conditions.push(
        `pp."practitionerType" = $${paramIndex}::"PractitionerType"`,
      );
      params.push(query.practitionerType);
      paramIndex++;
    }

    if (query.minRating !== undefined) {
      conditions.push(`pp."ratingAvg" >= $${paramIndex}`);
      params.push(query.minRating);
      paramIndex++;
    }

    if (query.maxFee !== undefined) {
      conditions.push(`pp."baseConsultationFee" <= $${paramIndex}`);
      params.push(query.maxFee);
      paramIndex++;
    }

    if (query.language !== undefined) {
      conditions.push(`u."languagePreference" = $${paramIndex}`);
      params.push(query.language);
      paramIndex++;
    }

    if (query.specialization !== undefined) {
      conditions.push(
        `$${paramIndex} = ANY(pp.specializations)`,
      );
      params.push(query.specialization);
      paramIndex++;
    }

    if (query.gender !== undefined) {
      // Gender is on PatientProfile; for practitioners, we check user-level
      // The schema does not have gender on User directly, so we skip this
      // or look at PractitionerProfile. Since there is no gender on
      // PractitionerProfile or User, we handle this gracefully.
      // We'll note this is a no-op unless the schema is extended.
    }

    if (query.isAvailable !== undefined) {
      conditions.push(`pp."isAvailable" = $${paramIndex}`);
      params.push(query.isAvailable);
      paramIndex++;
    }

    if (query.hpczVerified !== undefined) {
      conditions.push(`pp."hpczVerified" = $${paramIndex}`);
      params.push(query.hpczVerified);
      paramIndex++;
    }

    if (query.offersHomeVisits !== undefined) {
      conditions.push(`pp."offersHomeVisits" = $${paramIndex}`);
      params.push(query.offersHomeVisits);
      paramIndex++;
    }

    if (query.offersClinicVisits !== undefined) {
      conditions.push(`pp."offersClinicVisits" = $${paramIndex}`);
      params.push(query.offersClinicVisits);
      paramIndex++;
    }

    if (query.diagnosticTestId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM practitioner_type_diagnostic_tests ptdt
        WHERE ptdt."practitionerType"::text = pp."practitionerType"::text
          AND ptdt."diagnosticTestId" = $${paramIndex}::uuid
      )`);
      params.push(query.diagnosticTestId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Add limit and offset as parameters
    params.push(limit);
    const limitParam = paramIndex;
    paramIndex++;
    params.push(offset);
    const offsetParam = paramIndex;

    const distanceFormula = `
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians($1)) * cos(radians(pp.latitude)) *
          cos(radians(pp.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(pp.latitude))
        ))
      )
    `;

    const sql = `
      SELECT
        pp.id,
        pp."userId",
        pp."practitionerType",
        pp."hpczRegistrationNumber",
        pp."hpczVerified",
        pp.specializations,
        pp.bio,
        pp."serviceRadiusKm",
        pp."baseConsultationFee",
        pp."isAvailable",
        pp."ratingAvg",
        pp."ratingCount",
        pp.latitude,
        pp.longitude,
        pp."operatingCenterName",
        pp."operatingCenterAddress",
        pp."operatingCenterCity",
        pp."operatingCenterPhone",
        pp."offersHomeVisits",
        pp."offersClinicVisits",
        u."firstName",
        u."lastName",
        u.email,
        u.phone,
        u."languagePreference",
        ${distanceFormula} AS "distanceKm"
      FROM practitioner_profiles pp
      INNER JOIN users u ON u.id = pp."userId"
      WHERE ${whereClause}
        AND ${distanceFormula} <= $3
      ORDER BY ${distanceFormula} ASC
      LIMIT $${limitParam}
      OFFSET $${offsetParam}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM practitioner_profiles pp
      INNER JOIN users u ON u.id = pp."userId"
      WHERE ${whereClause}
        AND ${distanceFormula} <= $3
    `;

    const [results, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe(sql, ...params),
      this.prisma.$queryRawUnsafe<{ total: number }[]>(
        countSql,
        ...params.slice(0, params.length - 2), // exclude limit/offset
      ),
    ]);

    const total = Array.isArray(countResult) && countResult.length > 0
      ? (countResult[0] as any).total
      : 0;

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Standard search without distance calculation.
   */
  private async searchWithoutDistance(
    query: SearchPractitionersDto,
    page: number,
    limit: number,
    offset: number,
  ) {
    const where: Prisma.PractitionerProfileWhereInput = {
      user: {
        isActive: true,
      },
    };

    if (query.practitionerType !== undefined) {
      where.practitionerType = query.practitionerType;
    }

    if (query.minRating !== undefined) {
      where.ratingAvg = { gte: query.minRating };
    }

    if (query.maxFee !== undefined) {
      where.baseConsultationFee = {
        lte: new Prisma.Decimal(query.maxFee),
      };
    }

    if (query.language !== undefined) {
      where.user = {
        ...(where.user as Prisma.UserWhereInput),
        languagePreference: query.language,
      };
    }

    if (query.specialization !== undefined) {
      where.specializations = { has: query.specialization };
    }

    if (query.isAvailable !== undefined) {
      where.isAvailable = query.isAvailable;
    }

    if (query.hpczVerified !== undefined) {
      where.hpczVerified = query.hpczVerified;
    }

    if (query.offersHomeVisits !== undefined) {
      where.offersHomeVisits = query.offersHomeVisits;
    }

    if (query.offersClinicVisits !== undefined) {
      where.offersClinicVisits = query.offersClinicVisits;
    }

    if (query.diagnosticTestId) {
      // Find which practitioner types support this test
      const mappings = await this.prisma.practitionerTypeDiagnosticTest.findMany({
        where: { diagnosticTestId: query.diagnosticTestId },
        select: { practitionerType: true },
      });
      const types = mappings.map((m) => m.practitionerType);
      if (types.length > 0) {
        where.practitionerType = { in: types };
      } else {
        // No practitioner type supports this test — return empty
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.practitionerProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              languagePreference: true,
            },
          },
        },
        orderBy: { ratingAvg: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.practitionerProfile.count({ where }),
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
   * Get a single practitioner's public profile by profile ID.
   */
  async getById(id: string) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { id },
      include: {
        operatingCenters: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            languagePreference: true,
            isActive: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner not found');
    }

    if (!profile.user.isActive) {
      throw new NotFoundException('Practitioner not found');
    }

    // Fetch available diagnostic tests grouped by category
    const tests = await this.prisma.diagnosticTest.findMany({
      where: {
        isActive: true,
        practitionerTypes: {
          some: { practitionerType: profile.practitionerType },
        },
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    const diagnosticTests: Record<string, { label: string; tests: typeof tests }> = {};
    const categoryLabels: Record<string, string> = {
      LAB_TEST: 'Lab Tests',
      RAPID_TEST: 'Rapid Tests',
      IMAGING: 'Imaging',
      SWAB_CULTURE: 'Swabs & Cultures',
      SCREENING: 'Screening',
      SPECIALIZED: 'Specialized',
    };
    for (const test of tests) {
      if (!diagnosticTests[test.category]) {
        diagnosticTests[test.category] = {
          label: categoryLabels[test.category] || test.category,
          tests: [],
        };
      }
      diagnosticTests[test.category].tests.push(test);
    }

    return { ...profile, diagnosticTests };
  }

  /**
   * Get paginated reviews for a practitioner.
   */
  async getReviews(practitionerId: string, page: number = 1, limit: number = 20) {
    // Verify practitioner exists
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { id: practitionerId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner not found');
    }

    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          practitionerId: profile.userId,
          isPublic: true,
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.review.count({
        where: {
          practitionerId: profile.userId,
          isPublic: true,
        },
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
   * Admin: Verify or reject a practitioner document.
   */
  async verifyDocument(
    adminUserId: string,
    documentId: string,
    dto: VerifyDocumentDto,
  ) {
    const document = await this.prisma.practitionerDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!dto.approved && !dto.rejectionReason) {
      throw new BadRequestException(
        'A rejection reason is required when rejecting a document',
      );
    }

    const updated = await this.prisma.practitionerDocument.update({
      where: { id: documentId },
      data: {
        verified: dto.approved,
        verifiedBy: adminUserId,
        verifiedAt: new Date(),
        rejectionReason: dto.approved ? null : dto.rejectionReason,
      },
    });

    return updated;
  }

  /**
   * Admin: Mark a practitioner as HPCZ verified.
   */
  async verifyPractitioner(adminUserId: string, practitionerId: string) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { id: practitionerId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    if (profile.hpczVerified) {
      throw new BadRequestException('Practitioner is already HPCZ verified');
    }

    const updated = await this.prisma.practitionerProfile.update({
      where: { id: practitionerId },
      data: { hpczVerified: true },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }

  // =========================================================================
  // Operating Centers CRUD
  // =========================================================================

  /**
   * List operating centers for the authenticated practitioner.
   */
  async getOperatingCenters(userId: string) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    return this.prisma.operatingCenter.findMany({
      where: { practitionerProfileId: profile.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a new operating center for the authenticated practitioner.
   */
  async createOperatingCenter(userId: string, dto: CreateOperatingCenterDto) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    return this.prisma.operatingCenter.create({
      data: {
        practitionerProfileId: profile.id,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        phone: dto.phone,
      },
    });
  }

  /**
   * Update an operating center (verify ownership).
   */
  async updateOperatingCenter(
    userId: string,
    centerId: string,
    dto: UpdateOperatingCenterDto,
  ) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    const center = await this.prisma.operatingCenter.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      throw new NotFoundException('Operating center not found');
    }

    if (center.practitionerProfileId !== profile.id) {
      throw new ForbiddenException(
        'You do not have permission to update this operating center',
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.phone !== undefined) data.phone = dto.phone;

    return this.prisma.operatingCenter.update({
      where: { id: centerId },
      data,
    });
  }

  /**
   * Delete an operating center (verify ownership).
   */
  async deleteOperatingCenter(userId: string, centerId: string) {
    const profile = await this.prisma.practitionerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Practitioner profile not found');
    }

    const center = await this.prisma.operatingCenter.findUnique({
      where: { id: centerId },
    });

    if (!center) {
      throw new NotFoundException('Operating center not found');
    }

    if (center.practitionerProfileId !== profile.id) {
      throw new ForbiddenException(
        'You do not have permission to delete this operating center',
      );
    }

    await this.prisma.operatingCenter.delete({
      where: { id: centerId },
    });

    return { message: 'Operating center deleted successfully' };
  }

  /**
   * Admin: List practitioners with pending verification (not HPCZ verified).
   */
  async getPendingVerifications(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const where: Prisma.PractitionerProfileWhereInput = {
      hpczVerified: false,
      user: {
        isActive: true,
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.practitionerProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          },
          documents: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.practitionerProfile.count({ where }),
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
}
