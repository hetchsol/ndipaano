import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType } from '@prisma/client';

export class CreateConditionSummaryDto {
  @ApiProperty({ description: 'Description of symptoms' })
  @IsString()
  symptoms: string;

  @ApiProperty({ enum: ServiceType })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiPropertyOptional({ enum: ['LOW', 'MODERATE', 'HIGH', 'EMERGENCY'], default: 'MODERATE' })
  @IsOptional()
  @IsEnum(['LOW', 'MODERATE', 'HIGH', 'EMERGENCY'] as const)
  urgency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

export class UpdateConditionSummaryDto {
  @ApiPropertyOptional({ description: 'Description of symptoms' })
  @IsOptional()
  @IsString()
  symptoms?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MODERATE', 'HIGH', 'EMERGENCY'] })
  @IsOptional()
  @IsEnum(['LOW', 'MODERATE', 'HIGH', 'EMERGENCY'] as const)
  urgency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

export class ConditionSummaryQueryDto {
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

  @ApiPropertyOptional({ enum: ['ACTIVE', 'ADOPTED', 'WITHDRAWN'] })
  @IsOptional()
  @IsString()
  status?: string;
}
