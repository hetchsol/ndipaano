import {
  IsEnum,
  IsUUID,
  IsOptional,
  IsString,
  IsObject,
  IsInt,
  Min,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// InitiatePaymentDto
// ---------------------------------------------------------------------------

export class InitiatePaymentDto {
  @ApiProperty({
    description: 'ID of the booking to pay for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  bookingId: string;

  @ApiProperty({
    description: 'Payment method to use',
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY_MTN,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Callback URL for payment provider redirect',
    example: 'https://app.ndiipano.co.zm/payments/callback',
  })
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}

// ---------------------------------------------------------------------------
// PaystackWebhookDto
// ---------------------------------------------------------------------------

export class PaystackWebhookDataDto {
  @ApiProperty({ description: 'Payment provider reference' })
  @IsString()
  reference: string;

  @ApiProperty({ description: 'Transaction status from provider' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Amount in lowest currency unit (ngwee)' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Transaction channel' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ description: 'Gateway response message' })
  @IsOptional()
  @IsString()
  gateway_response?: string;
}

export class PaystackWebhookDto {
  @ApiProperty({
    description: 'Webhook event type',
    example: 'charge.success',
  })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Webhook event data payload',
    type: PaystackWebhookDataDto,
  })
  @IsObject()
  data: PaystackWebhookDataDto;
}

// ---------------------------------------------------------------------------
// PaymentQueryDto
// ---------------------------------------------------------------------------

export class PaymentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by payment status',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter payments created on or after this date (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter payments created on or before this date (ISO 8601)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ---------------------------------------------------------------------------
// InsuranceClaimDto
// ---------------------------------------------------------------------------

export class InsuranceClaimDto {
  @ApiProperty({
    description: 'ID of the booking this claim relates to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  bookingId: string;

  @ApiProperty({
    description: 'Name of the insurance provider',
    example: 'ZSIC Life',
  })
  @IsString()
  insuranceProvider: string;

  @ApiProperty({
    description: 'Claim amount in ZMW',
    example: 500.0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Additional notes for the insurance claim',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ---------------------------------------------------------------------------
// PayoutRequestDto
// ---------------------------------------------------------------------------

export class PayoutRequestDto {
  @ApiPropertyOptional({
    description: 'Start date for payout period filter (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for payout period filter (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ---------------------------------------------------------------------------
// EarningsQueryDto
// ---------------------------------------------------------------------------

export class EarningsQueryDto {
  @ApiPropertyOptional({
    description: 'Period for earnings summary',
    enum: ['week', 'month', 'quarter', 'year', 'all'],
    default: 'month',
  })
  @IsOptional()
  @IsString()
  period?: 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month';
}
