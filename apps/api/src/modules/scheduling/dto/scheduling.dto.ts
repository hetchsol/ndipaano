import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBlackoutDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  @IsOptional()
  startTime?: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format',
  })
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class BlackoutQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  @IsOptional()
  startDate?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  @IsOptional()
  endDate?: string;
}

export class AvailableSlotsQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  startDate: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  endDate: string;
}

export class CalendarQueryDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  @Type(() => Number)
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month: number;
}

export class RescheduleBookingDto {
  @IsDateString()
  scheduledAt: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateSchedulingSettingsDto {
  @IsInt()
  @Min(15)
  @Max(240)
  @Type(() => Number)
  @IsOptional()
  slotDurationMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(60)
  @Type(() => Number)
  @IsOptional()
  bufferMinutes?: number;
}
