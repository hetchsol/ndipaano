import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  DocumentType,
  PractitionerType,
  Gender,
} from '@prisma/client';

export class UpdatePractitionerProfileDto {
  @ApiPropertyOptional({
    description: 'Professional biography',
    example:
      'Registered nurse with 10 years of experience in home-based care across Lusaka Province.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({
    description: 'List of specializations',
    example: ['Wound Care', 'IV Therapy', 'Palliative Care'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({
    description: 'Service radius in kilometers',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  serviceRadiusKm?: number;

  @ApiPropertyOptional({
    description: 'Base consultation fee in ZMW',
    example: 250.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseConsultationFee?: number;

  @ApiPropertyOptional({
    description: 'Language preference (ISO 639-1)',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  languagePreference?: string;
}

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Type of document',
    enum: DocumentType,
    example: DocumentType.HPCZ_CERTIFICATE,
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({
    description: 'Original file name',
    example: 'hpcz-certificate-2024.pdf',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  fileName: string;

  @ApiProperty({
    description: 'URL where the file is stored (S3, etc.)',
    example: 'https://ndipaano-docs.s3.af-south-1.amazonaws.com/practitioners/abc123/hpcz-cert.pdf',
  })
  @IsString()
  @MinLength(1)
  fileUrl: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
  })
  @IsInt()
  @Min(1)
  fileSize: number;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  mimeType: string;

  @ApiPropertyOptional({
    description: 'Expiry date of the document',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class SearchPractitionersDto {
  @ApiPropertyOptional({
    description: 'Filter by practitioner type',
    enum: PractitionerType,
    example: PractitionerType.REGISTERED_NURSE,
  })
  @IsOptional()
  @IsEnum(PractitionerType)
  practitionerType?: PractitionerType;

  @ApiPropertyOptional({
    description: 'Latitude for distance-based search',
    example: -15.3875,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude for distance-based search',
    example: 28.3228,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers (requires latitude/longitude)',
    example: 25,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  radiusKm?: number;

  @ApiPropertyOptional({
    description: 'Minimum average rating',
    example: 4.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Maximum consultation fee in ZMW',
    example: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxFee?: number;

  @ApiPropertyOptional({
    description: 'Filter by language (ISO 639-1)',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Filter by specialization keyword',
    example: 'Wound Care',
  })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiPropertyOptional({
    description: 'Filter by gender',
    enum: Gender,
    example: Gender.FEMALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'Filter by availability',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by HPCZ verification status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hpczVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Results per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class VerifyDocumentDto {
  @ApiProperty({
    description: 'Whether the document is approved',
    example: true,
  })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({
    description: 'Reason for rejection (required if not approved)',
    example: 'Document is expired. Please upload a current HPCZ certificate.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}

export class UpdateLocationDto {
  @ApiProperty({
    description: 'Current latitude',
    example: -15.3875,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Current longitude',
    example: 28.3228,
  })
  @IsNumber()
  longitude: number;
}
