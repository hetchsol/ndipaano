import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsInt,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DiagnosticTestCategory, PractitionerType } from '@prisma/client';

export class SearchDiagnosticTestsDto {
  @ApiPropertyOptional({
    description: 'Filter by test category',
    enum: DiagnosticTestCategory,
    example: DiagnosticTestCategory.RAPID_TEST,
  })
  @IsOptional()
  @IsEnum(DiagnosticTestCategory)
  category?: DiagnosticTestCategory;

  @ApiPropertyOptional({
    description: 'Filter by practitioner type',
    enum: PractitionerType,
    example: PractitionerType.PHARMACIST,
  })
  @IsOptional()
  @IsEnum(PractitionerType)
  practitionerType?: PractitionerType;

  @ApiPropertyOptional({
    description: 'Search by test name (partial match)',
    example: 'malaria',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Results per page',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
