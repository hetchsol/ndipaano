import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  IsNumber,
  IsLatitude,
  IsLongitude,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BookingStatus, ServiceType } from '@prisma/client';

// =============================================================================
// CreateBookingDto
// =============================================================================

export class CreateBookingDto {
  @ApiProperty({
    description: 'UUID of the practitioner to book',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  practitionerId: string;

  @ApiProperty({
    description: 'Type of medical service requested',
    enum: ServiceType,
    example: ServiceType.GENERAL_CONSULTATION,
  })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiProperty({
    description: 'Scheduled date and time for the booking (must be in the future)',
    example: '2026-03-15T10:00:00.000Z',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description: 'Street address for the home visit',
    example: '123 Cairo Road, Lusaka',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'City for the home visit',
    example: 'Lusaka',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Province for the home visit',
    example: 'Lusaka Province',
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({
    description: 'Latitude of the visit location',
    example: -15.3875,
  })
  @IsOptional()
  @IsLatitude()
  locationLat?: number;

  @ApiPropertyOptional({
    description: 'Longitude of the visit location',
    example: 28.3228,
  })
  @IsOptional()
  @IsLongitude()
  locationLng?: number;

  @ApiPropertyOptional({
    description: 'Additional notes or special instructions for the practitioner',
    example: 'Patient requires wheelchair access. Gate code: 1234.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// =============================================================================
// UpdateBookingStatusDto
// =============================================================================

export class UpdateBookingStatusDto {
  @ApiProperty({
    description: 'New booking status',
    enum: BookingStatus,
  })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiPropertyOptional({
    description: 'Reason for cancellation (required when cancelling an accepted or in-progress booking)',
    example: 'Patient requested reschedule due to emergency.',
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

// =============================================================================
// RejectBookingDto
// =============================================================================

export class RejectBookingDto {
  @ApiPropertyOptional({
    description: 'Reason for rejecting the booking',
    example: 'I am not available at the requested time.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

// =============================================================================
// CancelBookingDto
// =============================================================================

export class CancelBookingDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation (required when cancelling an accepted or in-progress booking)',
    example: 'Unforeseen emergency, unable to attend.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

// =============================================================================
// BookingQueryDto
// =============================================================================

export class BookingQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by booking status',
    enum: BookingStatus,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

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
    description: 'Filter bookings from this date',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter bookings until this date',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
