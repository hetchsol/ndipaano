import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// =============================================================================
// TriggerPanicDto
// =============================================================================

export class TriggerPanicDto {
  @ApiProperty({
    description: 'Latitude of the user when triggering panic',
    example: -15.3875,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude of the user when triggering panic',
    example: 28.3228,
  })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: 'Optional message describing the emergency',
    example: 'I need immediate medical assistance, chest pains.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

// =============================================================================
// EmergencyContactDto
// =============================================================================

export class EmergencyContactDto {
  @ApiProperty({
    description: 'Contact name',
    example: 'Jane Mwila',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+260971234567',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone: string;

  @ApiProperty({
    description: 'Relationship to the user',
    example: 'Spouse',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  relationship: string;

  @ApiPropertyOptional({
    description: 'Whether this is the primary emergency contact',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

// =============================================================================
// NearbyServicesQueryDto
// =============================================================================

export class NearbyServicesQueryDto {
  @ApiProperty({
    description: 'Latitude of the user',
    example: -15.3875,
  })
  @Type(() => Number)
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude of the user',
    example: 28.3228,
  })
  @Type(() => Number)
  @IsNumber()
  longitude: number;
}
