import { IsString, IsUUID, IsEnum, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { TelehealthSessionStatus } from '@prisma/client';

export class CreateTelehealthSessionDto {
  @IsUUID()
  bookingId: string;
}

export class UpdateSessionStatusDto {
  @IsEnum(TelehealthSessionStatus)
  status: TelehealthSessionStatus;

  @IsString()
  @IsOptional()
  practitionerNotes?: string;
}

export class RecordConsentDto {
  @IsBoolean()
  recordingConsent: boolean;
}

export class SessionSignalDto {
  @IsIn(['offer', 'answer', 'ice-candidate'])
  type: 'offer' | 'answer' | 'ice-candidate';

  payload: any;

  @IsUUID()
  targetUserId: string;
}
