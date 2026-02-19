import { IsEnum, IsString, IsOptional, MaxLength, IsInt, Min, Max } from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;

  @IsString()
  @MaxLength(5000)
  content: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  fileName?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50 * 1024 * 1024) // 50MB
  fileSize?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  mimeType?: string;
}
