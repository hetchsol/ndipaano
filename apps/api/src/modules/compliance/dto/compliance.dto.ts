import {
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ConsentType } from '@prisma/client';

// =============================================================================
// AuditLogQueryDto
// =============================================================================

export class AuditLogQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by action type',
    example: 'LOGIN',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by resource type',
    example: 'User',
  })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

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
// UpdateConsentDto
// =============================================================================

export class UpdateConsentDto {
  @ApiProperty({
    description: 'Type of consent to update',
    enum: ConsentType,
    example: ConsentType.DATA_PROCESSING,
  })
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @ApiProperty({
    description: 'Whether consent is granted or revoked',
    example: true,
  })
  @IsBoolean()
  granted: boolean;
}

// =============================================================================
// ProcessDataRequestDto
// =============================================================================

export class ProcessDataRequestDto {
  @ApiProperty({
    description: 'Admin response to the data subject request',
    example: 'Your data export has been prepared and is available for download.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  response: string;

  @ApiProperty({
    description: 'New status for the data request',
    enum: ['COMPLETED', 'REJECTED'],
    example: 'COMPLETED',
  })
  @IsEnum(['COMPLETED', 'REJECTED'] as const, {
    message: 'Status must be either COMPLETED or REJECTED',
  })
  status: 'COMPLETED' | 'REJECTED';
}

// =============================================================================
// CreateBreachNotificationDto
// =============================================================================

export class CreateBreachNotificationDto {
  @ApiProperty({
    description: 'Description of the data breach',
    example: 'Unauthorized access to patient records detected from external IP.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @ApiProperty({
    description: 'Number of users affected by the breach',
    example: 150,
  })
  @IsInt()
  @Min(0)
  affectedUsersCount: number;

  @ApiProperty({
    description: 'Severity level of the breach',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'HIGH',
  })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const, {
    message: 'Severity must be one of: LOW, MEDIUM, HIGH, CRITICAL',
  })
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({
    description: 'Steps taken to remediate the breach',
    example: 'Rotated all API keys and forced password resets for affected accounts.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remediationSteps?: string;
}

// =============================================================================
// UpdateBreachNotificationDto
// =============================================================================

export class UpdateBreachNotificationDto {
  @ApiPropertyOptional({
    description: 'Whether the data protection commissioner has been notified',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  commissionerNotified?: boolean;

  @ApiPropertyOptional({
    description: 'Updated remediation steps',
    example: 'Completed full security audit and patched vulnerability.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remediationSteps?: string;

  @ApiPropertyOptional({
    description: 'Date when the breach was reported to the commissioner',
    example: '2026-02-15T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  reportedAt?: string;
}

// =============================================================================
// BreachQueryDto
// =============================================================================

export class BreachQueryDto {
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
    description: 'Filter by severity level',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const, {
    message: 'Severity must be one of: LOW, MEDIUM, HIGH, CRITICAL',
  })
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
