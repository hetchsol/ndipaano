import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PractitionerType, Gender } from '@prisma/client';

// =============================================================================
// SearchPractitionersDto
// =============================================================================

export class SearchPractitionersDto {
  @ApiPropertyOptional({
    description: 'Filter by practitioner type',
    enum: PractitionerType,
    example: PractitionerType.GENERAL_PRACTITIONER,
  })
  @IsOptional()
  @IsEnum(PractitionerType)
  practitionerType?: PractitionerType;

  @ApiPropertyOptional({
    description: 'Latitude for location-based search',
    example: -15.3875,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude for location-based search',
    example: 28.3228,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers',
    default: 25,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  radiusKm?: number = 25;

  @ApiPropertyOptional({
    description: 'Minimum average rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Maximum consultation fee in ZMW',
    example: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxFee?: number;

  @ApiPropertyOptional({
    description: 'Filter by language preference (ISO 639-1)',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiPropertyOptional({
    description: 'Filter by specialization',
    example: 'cardiology',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;

  @ApiPropertyOptional({
    description: 'Filter by gender',
    enum: Gender,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'Sort results by',
    enum: ['distance', 'rating', 'fee'],
    default: 'distance',
  })
  @IsOptional()
  @IsEnum(['distance', 'rating', 'fee'] as const, {
    message: 'sortBy must be one of: distance, rating, fee',
  })
  sortBy?: 'distance' | 'rating' | 'fee' = 'distance';

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
// SearchPharmaciesDto
// =============================================================================

export class SearchPharmaciesDto {
  @ApiPropertyOptional({
    description: 'Latitude for location-based search',
    example: -15.3875,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude for location-based search',
    example: 28.3228,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers',
    default: 25,
    minimum: 1,
    maximum: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  radiusKm?: number = 25;

  @ApiPropertyOptional({
    description: 'Search by pharmacy name',
    example: 'Link Pharmacy',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

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
