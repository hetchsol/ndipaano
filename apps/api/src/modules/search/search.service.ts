import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, ServiceType } from '@prisma/client';
import { SearchPractitionersDto, SearchPharmaciesDto } from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Full search for practitioners with filters including geolocation.
   * Uses the Haversine formula in raw SQL for distance calculations.
   */
  async searchPractitioners(query: SearchPractitionersDto) {
    const {
      practitionerType,
      latitude,
      longitude,
      radiusKm,
      minRating,
      maxFee,
      language,
      specialization,
      gender,
      sortBy,
      page,
      limit,
    } = query;

    const offset = (page - 1) * limit;
    const hasLocationSearch = latitude !== undefined && longitude !== undefined;

    // Build dynamic WHERE conditions
    const conditions: string[] = [
      'pp."hpczVerified" = true',
      'pp."isAvailable" = true',
      'u."isActive" = true',
    ];
    const params: any[] = [];
    let paramIndex = 1;

    if (practitionerType) {
      conditions.push(`pp."practitionerType" = $${paramIndex}::text::"PractitionerType"`);
      params.push(practitionerType);
      paramIndex++;
    }

    if (minRating) {
      conditions.push(`pp."ratingAvg" >= $${paramIndex}`);
      params.push(minRating);
      paramIndex++;
    }

    if (maxFee !== undefined) {
      conditions.push(`pp."baseConsultationFee" <= $${paramIndex}`);
      params.push(maxFee);
      paramIndex++;
    }

    if (language) {
      conditions.push(`u."languagePreference" = $${paramIndex}`);
      params.push(language);
      paramIndex++;
    }

    if (specialization) {
      conditions.push(`$${paramIndex} = ANY(pp."specializations")`);
      params.push(specialization);
      paramIndex++;
    }

    if (gender) {
      // Gender is on PatientProfile but practitioners may have it via a join or separate field
      // Since the schema has gender on PatientProfile, we filter via a subquery on PatientProfile if it exists
      conditions.push(`EXISTS (
        SELECT 1 FROM patient_profiles pat WHERE pat."userId" = u."id" AND pat."gender" = $${paramIndex}::text::"Gender"
      )`);
      params.push(gender);
      paramIndex++;
    }

    // Distance calculation using Haversine formula
    let distanceSelect = 'NULL::float AS distance';
    if (hasLocationSearch) {
      distanceSelect = `
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($${paramIndex})) * cos(radians(pp."latitude")) *
            cos(radians(pp."longitude") - radians($${paramIndex + 1})) +
            sin(radians($${paramIndex})) * sin(radians(pp."latitude"))
          ))
        )) AS distance
      `;
      params.push(latitude, longitude);

      // Only include practitioners with coordinates set
      conditions.push('pp."latitude" IS NOT NULL');
      conditions.push('pp."longitude" IS NOT NULL');

      paramIndex += 2;
    }

    const whereClause = conditions.join(' AND ');

    // Build ORDER BY
    let orderBy = 'pp."ratingAvg" DESC';
    if (sortBy === 'distance' && hasLocationSearch) {
      orderBy = 'distance ASC';
    } else if (sortBy === 'rating') {
      orderBy = 'pp."ratingAvg" DESC';
    } else if (sortBy === 'fee') {
      orderBy = 'pp."baseConsultationFee" ASC';
    }

    // Build the full query
    const havingClause = hasLocationSearch
      ? `HAVING (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($${paramIndex - 2})) * cos(radians(pp."latitude")) *
            cos(radians(pp."longitude") - radians($${paramIndex - 1})) +
            sin(radians($${paramIndex - 2})) * sin(radians(pp."latitude"))
          ))
        )) <= $${paramIndex}`
      : '';

    if (hasLocationSearch) {
      params.push(radiusKm);
      paramIndex++;
    }

    // Add pagination params
    const limitParamIdx = paramIndex;
    const offsetParamIdx = paramIndex + 1;
    params.push(limit, offset);

    const dataQuery = `
      SELECT
        u."id" AS "userId",
        u."email",
        u."firstName",
        u."lastName",
        u."phone",
        u."languagePreference",
        pp."id" AS "practitionerProfileId",
        pp."practitionerType",
        pp."hpczRegistrationNumber",
        pp."specializations",
        pp."bio",
        pp."serviceRadiusKm",
        pp."baseConsultationFee",
        pp."isAvailable",
        pp."ratingAvg",
        pp."ratingCount",
        pp."latitude",
        pp."longitude",
        ${distanceSelect}
      FROM practitioner_profiles pp
      INNER JOIN users u ON u."id" = pp."userId"
      WHERE ${whereClause}
      ${hasLocationSearch ? `GROUP BY u."id", pp."id" ${havingClause}` : ''}
      ORDER BY ${orderBy}
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `;

    const countQuery = hasLocationSearch
      ? `
        SELECT COUNT(*) AS total FROM (
          SELECT pp."id",
            (6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($${paramIndex - 3})) * cos(radians(pp."latitude")) *
                cos(radians(pp."longitude") - radians($${paramIndex - 2})) +
                sin(radians($${paramIndex - 3})) * sin(radians(pp."latitude"))
              ))
            )) AS distance
          FROM practitioner_profiles pp
          INNER JOIN users u ON u."id" = pp."userId"
          WHERE ${whereClause}
          GROUP BY pp."id"
          HAVING (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($${paramIndex - 3})) * cos(radians(pp."latitude")) *
              cos(radians(pp."longitude") - radians($${paramIndex - 2})) +
              sin(radians($${paramIndex - 3})) * sin(radians(pp."latitude"))
            ))
          )) <= $${paramIndex - 1}
        ) AS filtered
      `
      : `
        SELECT COUNT(*) AS total
        FROM practitioner_profiles pp
        INNER JOIN users u ON u."id" = pp."userId"
        WHERE ${whereClause}
      `;

    // Remove pagination params for count query
    const countParams = hasLocationSearch
      ? params.slice(0, params.length - 2)
      : params.slice(0, params.length - 2);

    const [data, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe(dataQuery, ...params),
      this.prisma.$queryRawUnsafe(countQuery, ...countParams),
    ]);

    const total = Number((countResult as any[])[0]?.total || 0);

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
   * Search pharmacies by location and name.
   */
  async searchPharmacies(query: SearchPharmaciesDto) {
    const { latitude, longitude, radiusKm, name, page, limit } = query;
    const offset = (page - 1) * limit;
    const hasLocationSearch = latitude !== undefined && longitude !== undefined;

    if (hasLocationSearch) {
      const params: any[] = [latitude, longitude, radiusKm, limit, offset];
      const nameCondition = name
        ? `AND p."name" ILIKE $6`
        : '';
      if (name) {
        params.push(`%${name}%`);
      }

      const dataQuery = `
        SELECT
          p.*,
          (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($1)) * cos(radians(p."latitude")) *
              cos(radians(p."longitude") - radians($2)) +
              sin(radians($1)) * sin(radians(p."latitude"))
            ))
          )) AS distance
        FROM pharmacies p
        WHERE p."isActive" = true
          AND p."latitude" IS NOT NULL
          AND p."longitude" IS NOT NULL
          ${nameCondition}
        GROUP BY p."id"
        HAVING (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($1)) * cos(radians(p."latitude")) *
            cos(radians(p."longitude") - radians($2)) +
            sin(radians($1)) * sin(radians(p."latitude"))
          ))
        )) <= $3
        ORDER BY distance ASC
        LIMIT $4 OFFSET $5
      `;

      const countParams = name
        ? [latitude, longitude, radiusKm, `%${name}%`]
        : [latitude, longitude, radiusKm];
      const nameCountCondition = name ? `AND p."name" ILIKE $4` : '';

      const countQuery = `
        SELECT COUNT(*) AS total FROM (
          SELECT p."id",
            (6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($1)) * cos(radians(p."latitude")) *
                cos(radians(p."longitude") - radians($2)) +
                sin(radians($1)) * sin(radians(p."latitude"))
              ))
            )) AS distance
          FROM pharmacies p
          WHERE p."isActive" = true
            AND p."latitude" IS NOT NULL
            AND p."longitude" IS NOT NULL
            ${nameCountCondition}
          GROUP BY p."id"
          HAVING (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($1)) * cos(radians(p."latitude")) *
              cos(radians(p."longitude") - radians($2)) +
              sin(radians($1)) * sin(radians(p."latitude"))
            ))
          )) <= $3
        ) AS filtered
      `;

      const [data, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe(dataQuery, ...params),
        this.prisma.$queryRawUnsafe(countQuery, ...countParams),
      ]);

      const total = Number((countResult as any[])[0]?.total || 0);

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

    // Non-location search using Prisma query builder
    const where: Prisma.PharmacyWhereInput = {
      isActive: true,
    };

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.pharmacy.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { name: 'asc' },
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
   * Return list of available service types with descriptions.
   */
  async getServiceTypes() {
    const serviceTypes: Array<{ value: string; label: string; description: string }> = [
      {
        value: ServiceType.GENERAL_CONSULTATION,
        label: 'General Consultation',
        description: 'A general medical consultation with a healthcare practitioner at your home.',
      },
      {
        value: ServiceType.NURSING_CARE,
        label: 'Nursing Care',
        description: 'Professional nursing services including patient monitoring, medication administration, and care planning.',
      },
      {
        value: ServiceType.WOUND_DRESSING,
        label: 'Wound Dressing',
        description: 'Professional wound cleaning, dressing, and ongoing wound management.',
      },
      {
        value: ServiceType.INJECTION_ADMINISTRATION,
        label: 'Injection Administration',
        description: 'Safe and sterile administration of prescribed injections at home.',
      },
      {
        value: ServiceType.IV_THERAPY,
        label: 'IV Therapy',
        description: 'Intravenous fluid and medication administration by qualified practitioners.',
      },
      {
        value: ServiceType.PHYSIOTHERAPY,
        label: 'Physiotherapy',
        description: 'Physical rehabilitation and therapy sessions conducted at your home.',
      },
      {
        value: ServiceType.MATERNAL_CARE,
        label: 'Maternal Care',
        description: 'Pre-natal and post-natal care services for expectant and new mothers.',
      },
      {
        value: ServiceType.CHILD_WELLNESS,
        label: 'Child Wellness',
        description: 'Paediatric wellness checks, vaccinations, and developmental assessments.',
      },
      {
        value: ServiceType.CHRONIC_DISEASE_MANAGEMENT,
        label: 'Chronic Disease Management',
        description: 'Ongoing management and monitoring of chronic conditions such as diabetes, hypertension, and asthma.',
      },
      {
        value: ServiceType.PALLIATIVE_CARE,
        label: 'Palliative Care',
        description: 'Compassionate end-of-life care and symptom management at home.',
      },
      {
        value: ServiceType.POST_OPERATIVE_CARE,
        label: 'Post-Operative Care',
        description: 'Recovery support and monitoring after surgical procedures.',
      },
      {
        value: ServiceType.MENTAL_HEALTH,
        label: 'Mental Health',
        description: 'Mental health consultations and counselling sessions in the comfort of your home.',
      },
      {
        value: ServiceType.PHARMACY_DELIVERY,
        label: 'Pharmacy Delivery',
        description: 'Prescription medication delivery from registered pharmacies to your doorstep.',
      },
      {
        value: ServiceType.LAB_SAMPLE_COLLECTION,
        label: 'Lab Sample Collection',
        description: 'Collection of blood, urine, and other laboratory samples at home.',
      },
      {
        value: ServiceType.EMERGENCY_TRIAGE,
        label: 'Emergency Triage',
        description: 'Rapid initial assessment and stabilisation for medical emergencies.',
      },
    ];

    return serviceTypes;
  }
}
