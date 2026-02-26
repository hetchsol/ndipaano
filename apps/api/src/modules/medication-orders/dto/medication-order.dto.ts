import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MedicationOrderStatus, PaymentMethod } from '@prisma/client';

// =============================================================================
// CreateMedicationOrderDto
// =============================================================================

export class CreateMedicationOrderDto {
  @ApiProperty({ description: 'Prescription UUID to order medication for' })
  @IsUUID()
  prescriptionId: string;

  @ApiProperty({ description: 'Pharmacy UUID to order from' })
  @IsUUID()
  pharmacyId: string;

  @ApiPropertyOptional({ description: 'Delivery address (omit for pickup)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryAddress?: string;

  @ApiPropertyOptional({
    description: 'Payment method',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// =============================================================================
// MedicationOrderQueryDto
// =============================================================================

export class MedicationOrderQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: MedicationOrderStatus })
  @IsOptional()
  @IsEnum(MedicationOrderStatus)
  status?: MedicationOrderStatus;
}

// =============================================================================
// CancelMedicationOrderDto
// =============================================================================

export class CancelMedicationOrderDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

// =============================================================================
// PharmacySearchDto
// =============================================================================

export class PharmacySearchDto {
  @ApiPropertyOptional({ description: 'City name to filter by' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Patient latitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Patient longitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Search radius in km', default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  radiusKm?: number = 25;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
