import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsDateString,
  Equals,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * Gender enum matching the Prisma schema.
 */
enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/**
 * PractitionerType enum matching the Prisma schema.
 * Note: The Prisma schema uses different practitioner types than the shared package.
 */
enum PractitionerType {
  REGISTERED_NURSE = 'REGISTERED_NURSE',
  ENROLLED_NURSE = 'ENROLLED_NURSE',
  CLINICAL_OFFICER = 'CLINICAL_OFFICER',
  GENERAL_PRACTITIONER = 'GENERAL_PRACTITIONER',
  SPECIALIST_DOCTOR = 'SPECIALIST_DOCTOR',
  PHYSIOTHERAPIST = 'PHYSIOTHERAPIST',
  PHARMACIST = 'PHARMACIST',
  MIDWIFE = 'MIDWIFE',
}

export class RegisterPatientDto {
  @ApiPropertyOptional({
    description: 'User email address (optional)',
    example: 'patient@example.com',
  })
  @IsOptional()
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail({}, { message: 'Invalid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value.toLowerCase().trim() : undefined,
  )
  email?: string;

  @ApiProperty({
    description: 'Zambian phone number in format +260XXXXXXXXX',
    example: '+260971234567',
  })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+260[0-9]{9}$/, {
    message: 'Phone number must be in Zambian format: +260XXXXXXXXX',
  })
  phone: string;

  @ApiProperty({
    description:
      'Password (min 8 chars, must include uppercase, lowercase, number, and special character)',
    example: 'SecureP@ss1',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/[0-9]/, {
    message: 'Password must contain at least one number',
  })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'Password must contain at least one special character',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Mwila',
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(100, { message: 'First name must be at most 100 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Banda',
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name must be at most 100 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  lastName: string;

  @ApiProperty({
    description: 'Date of birth in YYYY-MM-DD format',
    example: '1990-05-15',
  })
  @IsDateString(
    {},
    { message: 'Date of birth must be a valid date in YYYY-MM-DD format' },
  )
  dateOfBirth: string;

  @ApiProperty({
    description: 'Gender',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsEnum(Gender, {
    message: 'Gender must be one of: MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY',
  })
  gender: Gender;

  @ApiProperty({
    description: 'Nationality of the client (e.g. "Zambian" or "Other")',
    example: 'Zambian',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nationality is required' })
  @MaxLength(100, { message: 'Nationality must be at most 100 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  nationality: string;

  @ApiPropertyOptional({
    description:
      'NRC number (required for Zambian nationals aged 18+, format: 123456/67/9) or Passport number (required for non-Zambians). Optional for Zambian nationals under 18.',
    example: '123456/67/9',
  })
  @IsOptional()
  @ValidateIf((o) => {
    if (!o.nationality || !o.dateOfBirth) return false;
    // Non-Zambian: passport required
    if (o.nationality !== 'Zambian') return true;
    // Zambian 18+: NRC required
    const dob = new Date(o.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 18;
  })
  @IsString()
  @IsNotEmpty({ message: 'NRC or Passport number is required' })
  @MaxLength(50, { message: 'NRC/Passport number must be at most 50 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined,
  )
  nrc?: string;

  @ApiProperty({
    description: 'Consent to data processing (must be true)',
    example: true,
  })
  @IsBoolean()
  @Equals(true, {
    message: 'You must consent to data processing to register',
  })
  consentDataProcessing: boolean;

  @ApiProperty({
    description: 'Consent to terms of service (must be true)',
    example: true,
  })
  @IsBoolean()
  @Equals(true, {
    message: 'You must accept the terms of service to register',
  })
  consentTerms: boolean;
}

export class RegisterPractitionerDto extends RegisterPatientDto {
  @ApiPropertyOptional({
    description: 'Nationality (optional for practitioners)',
    example: 'Zambian',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  override nationality: string;

  @ApiPropertyOptional({
    description: 'NRC or Passport number (optional for practitioners)',
    example: '123456/78/1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'NRC/Passport number must be at most 50 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  override nrc?: string;

  @ApiProperty({
    description: 'Type of healthcare practitioner',
    enum: PractitionerType,
    example: PractitionerType.GENERAL_PRACTITIONER,
  })
  @IsEnum(PractitionerType, {
    message:
      'Practitioner type must be one of: REGISTERED_NURSE, ENROLLED_NURSE, CLINICAL_OFFICER, GENERAL_PRACTITIONER, SPECIALIST_DOCTOR, PHYSIOTHERAPIST, PHARMACIST, MIDWIFE',
  })
  practitionerType: PractitionerType;

  @ApiProperty({
    description: 'Health Professions Council of Zambia registration number',
    example: 'HPCZ-12345',
  })
  @IsString()
  @IsNotEmpty({ message: 'HPCZ registration number is required' })
  @MaxLength(50, {
    message: 'HPCZ registration number must be at most 50 characters',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  hpczRegistrationNumber: string;

  @ApiProperty({
    description: 'Service radius in kilometers (1-100)',
    example: 25,
  })
  @IsNumber({}, { message: 'Service radius must be a number' })
  @Min(1, { message: 'Service radius must be at least 1 km' })
  @Max(100, { message: 'Service radius must be at most 100 km' })
  serviceRadiusKm: number;

  @ApiProperty({
    description: 'Base consultation fee in ZMW (0-100,000)',
    example: 350,
  })
  @IsNumber({}, { message: 'Base consultation fee must be a number' })
  @Min(0, { message: 'Consultation fee cannot be negative' })
  @Max(100000, { message: 'Consultation fee must be at most 100,000 ZMW' })
  baseConsultationFee: number;
}
