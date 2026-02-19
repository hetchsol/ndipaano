import { IsString, IsUUID, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { LabOrderStatus, LabOrderPriority, ResultInterpretation } from '@prisma/client';

export class CreateLabOrderDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  diagnosticTestId: string;

  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @IsEnum(LabOrderPriority)
  @IsOptional()
  priority?: LabOrderPriority;

  @IsString()
  @IsOptional()
  clinicalNotes?: string;
}

export class UpdateLabOrderStatusDto {
  @IsEnum(LabOrderStatus)
  status: LabOrderStatus;

  @IsString()
  @IsOptional()
  cancelledReason?: string;
}

export class CreateLabResultDto {
  @IsUUID()
  labOrderId: string;

  @IsString()
  resultValue: string;

  @IsString()
  @IsOptional()
  resultUnit?: string;

  @IsString()
  @IsOptional()
  referenceRangeMin?: string;

  @IsString()
  @IsOptional()
  referenceRangeMax?: string;

  @IsString()
  @IsOptional()
  referenceRangeText?: string;

  @IsEnum(ResultInterpretation)
  interpretation: ResultInterpretation;

  @IsString()
  @IsOptional()
  practitionerNotes?: string;
}

export class ListLabOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsEnum(LabOrderStatus)
  @IsOptional()
  status?: LabOrderStatus;

  @IsUUID()
  @IsOptional()
  patientId?: string;
}

export class PatientLabOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsEnum(LabOrderStatus)
  @IsOptional()
  status?: LabOrderStatus;
}
