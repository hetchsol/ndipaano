import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, DataRequestType } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'First name', example: 'Mwamba' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Chanda' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+260971234567',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Language preference (ISO 639-1)',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  languagePreference?: string;
}

export class UpdatePatientProfileDto {
  @ApiPropertyOptional({
    description: 'Date of birth',
    example: '1990-05-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Gender',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Blood type', example: 'O+' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodType?: string;

  @ApiPropertyOptional({
    description: 'Allergies as JSON (array of strings or structured data)',
    example: ['Penicillin', 'Peanuts'],
  })
  @IsOptional()
  allergiesJson?: any;

  @ApiPropertyOptional({
    description: 'Emergency contact name',
    example: 'Jane Mwila',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string;

  @ApiPropertyOptional({
    description: 'Emergency contact phone',
    example: '+260961234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContactPhone?: string;

  @ApiPropertyOptional({
    description: 'NHIMA number',
    example: 'NHIMA-12345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nhimaNumber?: string;

  @ApiPropertyOptional({
    description: 'Insurance provider name',
    example: 'Madison General Insurance',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  insuranceProvider?: string;

  @ApiPropertyOptional({
    description: 'Insurance policy number',
    example: 'POL-2024-00123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  insurancePolicyNumber?: string;

  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Cairo Road',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Lusaka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Province', example: 'Lusaka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;
}

export class AddFamilyMemberDto {
  @ApiProperty({ description: 'First name', example: 'Chilufya' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Mwamba' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Relationship to the patient',
    example: 'Daughter',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  relationship: string;

  @ApiPropertyOptional({
    description: 'Date of birth',
    example: '2015-03-20',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Gender',
    enum: Gender,
    example: Gender.FEMALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    description: 'Whether consent has been given to manage this family member',
    example: true,
  })
  @IsBoolean()
  consentGiven: boolean;
}

export class CreateDataSubjectRequestDto {
  @ApiProperty({
    description: 'Type of data subject request',
    enum: DataRequestType,
    example: DataRequestType.ACCESS,
  })
  @IsEnum(DataRequestType)
  requestType: DataRequestType;

  @ApiPropertyOptional({
    description: 'Description or details about the request',
    example: 'I would like to receive a copy of all my personal data held by Ndipaano.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
