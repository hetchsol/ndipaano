import {
  IsUUID,
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

// =============================================================================
// CreatePrescriptionDto
// =============================================================================

export class CreatePrescriptionDto {
  @ApiProperty({
    description: 'UUID of the medical record this prescription belongs to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  medicalRecordId: string;

  @ApiProperty({
    description: 'UUID of the patient receiving the prescription',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    description: 'Name of the prescribed medication',
    example: 'Amoxicillin 500mg',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  medicationName: string;

  @ApiProperty({
    description: 'Dosage instructions',
    example: '500mg',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  dosage: string;

  @ApiProperty({
    description: 'Frequency of medication intake',
    example: 'Three times daily',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  frequency: string;

  @ApiPropertyOptional({
    description: 'Duration of the prescription',
    example: '7 days',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  duration?: string;

  @ApiPropertyOptional({
    description: 'Quantity of medication units to dispense',
    example: 21,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Whether this is a controlled substance (ZAMRA regulated)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isControlledSubstance?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Controlled substance schedule (I-VI) as defined by ZAMRA. Required if isControlledSubstance is true.',
    example: 'II',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(I|II|III|IV|V|VI)$/, {
    message:
      'controlledSubstanceSchedule must be a valid ZAMRA schedule: I, II, III, IV, V, or VI',
  })
  controlledSubstanceSchedule?: string;

  @ApiPropertyOptional({
    description: 'Additional notes or instructions',
    example: 'Take with food. Avoid alcohol.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'UUID of the pharmacy to assign for dispensing',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @IsOptional()
  @IsUUID()
  pharmacyId?: string;
}

// =============================================================================
// AssignPharmacyDto
// =============================================================================

export class AssignPharmacyDto {
  @ApiProperty({
    description: 'UUID of the pharmacy to assign',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @IsUUID()
  pharmacyId: string;
}

// =============================================================================
// PrescriptionQueryDto
// =============================================================================

export class PrescriptionQueryDto {
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

  @ApiPropertyOptional({
    description: 'Filter by dispensed status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  dispensed?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by controlled substance status',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isControlledSubstance?: boolean;
}
