import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DiagnosticTestCategory, Prisma, PractitionerType } from '@prisma/client';
import { SearchDiagnosticTestsDto } from './dto/diagnostic-tests.dto';

const CATEGORY_LABELS: Record<DiagnosticTestCategory, string> = {
  LAB_TEST: 'Lab Tests',
  RAPID_TEST: 'Rapid Tests',
  IMAGING: 'Imaging',
  SWAB_CULTURE: 'Swabs & Cultures',
  SCREENING: 'Screening',
  SPECIALIZED: 'Specialized',
};

@Injectable()
export class DiagnosticTestsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchDiagnosticTestsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const where: Prisma.DiagnosticTestWhereInput = {
      isActive: true,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.practitionerType) {
      where.practitionerTypes = {
        some: { practitionerType: query.practitionerType },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.diagnosticTest.findMany({
        where,
        include: {
          practitionerTypes: {
            select: { practitionerType: true },
          },
        },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.diagnosticTest.count({ where }),
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

  async getByPractitionerType(type: PractitionerType) {
    const tests = await this.prisma.diagnosticTest.findMany({
      where: {
        isActive: true,
        practitionerTypes: {
          some: { practitionerType: type },
        },
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    // Group by category
    const grouped: Record<string, { label: string; tests: typeof tests }> = {};
    for (const test of tests) {
      if (!grouped[test.category]) {
        grouped[test.category] = {
          label: CATEGORY_LABELS[test.category],
          tests: [],
        };
      }
      grouped[test.category].tests.push(test);
    }

    return grouped;
  }

  async getCategories() {
    const counts = await this.prisma.diagnosticTest.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { category: 'asc' },
    });

    return counts.map((c) => ({
      value: c.category,
      label: CATEGORY_LABELS[c.category],
      count: c._count.id,
    }));
  }
}
