import {
  IsUUID,
  IsOptional,
  IsString,
  IsObject,
  IsInt,
  Min,
  IsDateString,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// VitalsDto - Nested object for vitals JSON
// ---------------------------------------------------------------------------

export class VitalsDto {
  @ApiPropertyOptional({
    description: 'Blood pressure reading (e.g. "120/80")',
    example: '120/80',
  })
  @IsOptional()
  @IsString()
  bloodPressure?: string;

  @ApiPropertyOptional({
    description: 'Heart rate in beats per minute',
    example: 72,
  })
  @IsOptional()
  @IsNumber()
  heartRate?: number;

  @ApiPropertyOptional({
    description: 'Body temperature in Celsius',
    example: 36.6,
  })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Body weight in kilograms',
    example: 70.5,
  })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({
    description: 'Height in centimeters',
    example: 175,
  })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({
    description: 'Oxygen saturation percentage (SpO2)',
    example: 98,
  })
  @IsOptional()
  @IsNumber()
  oxygenSaturation?: number;

  @ApiPropertyOptional({
    description: 'Respiratory rate in breaths per minute',
    example: 16,
  })
  @IsOptional()
  @IsNumber()
  respiratoryRate?: number;

  @ApiPropertyOptional({
    description: 'Blood glucose level in mmol/L',
    example: 5.5,
  })
  @IsOptional()
  @IsNumber()
  bloodGlucose?: number;
}

// ---------------------------------------------------------------------------
// CreateMedicalRecordDto
// ---------------------------------------------------------------------------

export class CreateMedicalRecordDto {
  @ApiProperty({
    description: 'Patient user ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({
    description: 'Associated booking ID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiProperty({
    description: 'Clinical diagnosis (will be encrypted at rest)',
    example: 'Upper respiratory tract infection',
  })
  @IsString()
  diagnosis: string;

  @ApiProperty({
    description: 'Treatment notes and plan (will be encrypted at rest)',
    example: 'Prescribed amoxicillin 500mg TDS for 7 days. Rest and hydration advised.',
  })
  @IsString()
  treatmentNotes: string;

  @ApiPropertyOptional({
    description: 'Patient vital signs',
    type: VitalsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalsDto)
  vitalsJson?: VitalsDto;
}

// ---------------------------------------------------------------------------
// UpdateMedicalRecordDto
// ---------------------------------------------------------------------------

export class UpdateMedicalRecordDto {
  @ApiPropertyOptional({
    description: 'Updated clinical diagnosis (will be encrypted at rest)',
  })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({
    description: 'Updated treatment notes (will be encrypted at rest)',
  })
  @IsOptional()
  @IsString()
  treatmentNotes?: string;

  @ApiPropertyOptional({
    description: 'Updated vital signs',
    type: VitalsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalsDto)
  vitalsJson?: VitalsDto;
}

// ---------------------------------------------------------------------------
// MedicalRecordQueryDto
// ---------------------------------------------------------------------------

export class MedicalRecordQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter records created on or after this date (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter records created on or before this date (ISO 8601)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
