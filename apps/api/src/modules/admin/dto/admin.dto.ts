import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

// =============================================================================
// UserQueryDto
// =============================================================================

export class UserQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Search by name or email',
    example: 'mwila',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// =============================================================================
// AnalyticsPeriodDto
// =============================================================================

export class AnalyticsPeriodDto {
  @ApiProperty({
    description: 'Analytics period granularity',
    enum: ['daily', 'weekly', 'monthly'],
    example: 'monthly',
  })
  @IsEnum(['daily', 'weekly', 'monthly'] as const, {
    message: 'Period must be one of: daily, weekly, monthly',
  })
  period: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({
    description: 'Start date for analytics range',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for analytics range',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// =============================================================================
// CreatePharmacyDto
// =============================================================================

export class CreatePharmacyDto {
  @ApiProperty({
    description: 'Pharmacy name',
    example: 'Link Pharmacy - Cairo Road',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'ZAMRA registration number',
    example: 'ZAMRA-PHR-2024-001',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  zamraRegistration: string;

  @ApiProperty({
    description: 'Street address',
    example: '123 Cairo Road',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  address: string;

  @ApiProperty({
    description: 'City',
    example: 'Lusaka',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({
    description: 'Province',
    example: 'Lusaka Province',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  province: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: -15.3875,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 28.3228,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    description: 'Phone number',
    example: '+260211234567',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'info@linkpharmacy.co.zm',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

// =============================================================================
// UpdatePharmacyDto
// =============================================================================

export class UpdatePharmacyDto extends PartialType(CreatePharmacyDto) {}

// =============================================================================
// CreateInventoryItemDto
// =============================================================================

export class CreateInventoryItemDto {
  @ApiProperty({
    description: 'Medication name',
    example: 'Amoxicillin 500mg',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  medicationName: string;

  @ApiPropertyOptional({
    description: 'Generic name of the medication',
    example: 'Amoxicillin',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  genericName?: string;

  @ApiProperty({
    description: 'Unit price in ZMW',
    example: 25.5,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'Quantity currently in stock',
    example: 100,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityInStock?: number;
}

// =============================================================================
// UpdateInventoryItemDto
// =============================================================================

export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {}
