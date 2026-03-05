import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReferralStatus, ReferralUrgency } from '@prisma/client';

export class CreateReferralDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Reason for referral' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ enum: ReferralUrgency, default: ReferralUrgency.ROUTINE })
  @IsOptional()
  @IsEnum(ReferralUrgency)
  urgency?: ReferralUrgency;

  @ApiPropertyOptional({ description: 'Practitioner being referred to' })
  @IsOptional()
  @IsUUID()
  referredPractitionerId?: string;

  @ApiPropertyOptional({ description: 'Associated booking ID' })
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @ApiPropertyOptional({ description: 'Clinical notes' })
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiPropertyOptional({ description: 'Required specialty' })
  @IsOptional()
  @IsString()
  specialtyRequired?: string;
}

export class ReferralQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ enum: ReferralStatus })
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

  @ApiPropertyOptional({ enum: ReferralUrgency })
  @IsOptional()
  @IsEnum(ReferralUrgency)
  urgency?: ReferralUrgency;
}

export class DeclineReferralDto {
  @ApiProperty({ description: 'Reason for declining' })
  @IsString()
  reason: string;
}

export class CompleteReferralDto {
  @ApiPropertyOptional({ description: 'Discharge notes' })
  @IsOptional()
  @IsString()
  dischargeNotes?: string;
}
