import {
  IsUUID,
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestByPractitionerDto {
  @ApiProperty({ description: 'Condition summary ID to adopt' })
  @IsUUID()
  conditionSummaryId: string;
}

export class RequestByPatientDto {
  @ApiProperty({ description: 'Condition summary ID' })
  @IsUUID()
  conditionSummaryId: string;

  @ApiProperty({ description: 'Practitioner ID to request' })
  @IsUUID()
  practitionerId: string;
}

export class DeclineAdoptionDto {
  @ApiPropertyOptional({ description: 'Reason for declining' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReleaseAdoptionDto {
  @ApiPropertyOptional({ description: 'Reason for releasing' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdoptionQueryDto {
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

  @ApiPropertyOptional({ enum: ['PENDING_PRACTITIONER_CONSENT', 'PENDING_PATIENT_CONSENT', 'ACTIVE', 'RELEASED', 'DECLINED'] })
  @IsOptional()
  @IsString()
  status?: string;
}

export class MatchedPatientsQueryDto {
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
}
