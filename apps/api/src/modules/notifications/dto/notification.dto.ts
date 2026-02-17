import {
  IsUUID,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { NotificationChannel } from '@prisma/client';

// =============================================================================
// SendNotificationDto
// =============================================================================

export class SendNotificationDto {
  @ApiProperty({
    description: 'UUID of the user to send the notification to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description:
      'Notification type identifier (e.g., BOOKING_CONFIRMED, PRESCRIPTION_READY)',
    example: 'BOOKING_CONFIRMED',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  type: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'Booking Confirmed',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Notification body/message',
    example: 'Your booking with Dr. Mwamba has been confirmed for March 15, 2026.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @ApiProperty({
    description: 'Delivery channel for the notification',
    enum: NotificationChannel,
    example: NotificationChannel.PUSH,
  })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiPropertyOptional({
    description: 'Additional metadata to attach to the notification',
    example: { bookingId: 'abc-123', practitionerName: 'Dr. Mwamba' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// =============================================================================
// NotificationQueryDto
// =============================================================================

export class NotificationQueryDto {
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
    description: 'Filter to show only unread notifications',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  unread?: boolean;
}
