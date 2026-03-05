import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarePlanStatus, MilestoneStatus } from '@prisma/client';

export class CreateMilestoneDto {
  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Milestone description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Target date' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

export class CreateCarePlanDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Care plan title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Care plan description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Initial milestones', type: [CreateMilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  milestones?: CreateMilestoneDto[];
}

export class UpdateCarePlanDto {
  @ApiPropertyOptional({ description: 'Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CarePlanStatus })
  @IsOptional()
  @IsEnum(CarePlanStatus)
  status?: CarePlanStatus;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateMilestoneDto {
  @ApiPropertyOptional({ description: 'Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: MilestoneStatus })
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @ApiPropertyOptional({ description: 'Target date' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

export class AddPractitionerDto {
  @ApiProperty({ description: 'Practitioner user ID' })
  @IsUUID()
  practitionerId: string;

  @ApiPropertyOptional({ description: 'Role in care plan' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class CarePlanQueryDto {
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

  @ApiPropertyOptional({ enum: CarePlanStatus })
  @IsOptional()
  @IsEnum(CarePlanStatus)
  status?: CarePlanStatus;
}
