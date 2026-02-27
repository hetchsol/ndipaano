import {
  IsUUID,
  IsEnum,
  IsArray,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReminderFrequency,
  NotificationChannel,
  AdherenceStatus,
  MedicationReminderStatus,
} from '@prisma/client';

export class CreateMedicationReminderDto {
  @ApiProperty({ description: 'Prescription ID' })
  @IsUUID()
  prescriptionId: string;

  @ApiProperty({ enum: ReminderFrequency })
  @IsEnum(ReminderFrequency)
  frequency: ReminderFrequency;

  @ApiProperty({ description: 'Times of day in HH:mm format', example: ['08:00', '20:00'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { each: true, message: 'Each time must be in HH:mm format' })
  timesOfDay: string[];

  @ApiProperty({ description: 'Start date' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Notification channels', enum: NotificationChannel, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(NotificationChannel, { each: true })
  notifyVia: NotificationChannel[];

  @ApiPropertyOptional({ description: 'Minutes after scheduled time before marking missed', default: 120 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  @Type(() => Number)
  missedWindowMinutes?: number;
}

export class UpdateMedicationReminderDto {
  @ApiPropertyOptional({ description: 'Times of day in HH:mm format' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { each: true, message: 'Each time must be in HH:mm format' })
  timesOfDay?: string[];

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Notification channels', enum: NotificationChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  notifyVia?: NotificationChannel[];

  @ApiPropertyOptional({ description: 'Minutes after scheduled time before marking missed' })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  @Type(() => Number)
  missedWindowMinutes?: number;

  @ApiPropertyOptional({ enum: MedicationReminderStatus })
  @IsOptional()
  @IsEnum(MedicationReminderStatus)
  status?: MedicationReminderStatus;
}

export class LogAdherenceDto {
  @ApiProperty({ description: 'Adherence log ID' })
  @IsUUID()
  adherenceLogId: string;

  @ApiProperty({ enum: ['TAKEN', 'SKIPPED'], description: 'Status: TAKEN or SKIPPED only' })
  @IsEnum(AdherenceStatus, { message: 'Status must be TAKEN or SKIPPED' })
  status: AdherenceStatus;

  @ApiPropertyOptional({ description: 'Reason for skipping' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class MedicationReminderQueryDto {
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

  @ApiPropertyOptional({ enum: MedicationReminderStatus })
  @IsOptional()
  @IsEnum(MedicationReminderStatus)
  status?: MedicationReminderStatus;
}

export class AdherenceSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by prescription ID' })
  @IsOptional()
  @IsUUID()
  prescriptionId?: string;

  @ApiPropertyOptional({ description: 'Start date for summary period' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for summary period' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
