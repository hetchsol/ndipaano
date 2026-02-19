import { IsString, MaxLength, IsInt, Min, Max } from 'class-validator';

export class UploadUrlDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(100)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024)
  fileSize: number;
}
