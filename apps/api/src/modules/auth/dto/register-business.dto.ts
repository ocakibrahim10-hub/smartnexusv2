import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterBusinessDto {
  @ApiProperty({ example: 'ABC Ticaret Ltd.' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'info@abc.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '5321234567' })
  @IsString()
  @MinLength(10)
  phone: string;

  @ApiPropertyOptional({ example: 'GucluSifre2026!' })
  @IsOptional()
  @ValidateIf((o) => o.password != null && String(o.password).trim() !== '')
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxOffice?: string;

  @ApiPropertyOptional({ enum: ['BASIC', 'PROFESSIONAL', 'PLATINUM'] })
  @IsOptional()
  @IsIn(['BASIC', 'PROFESSIONAL', 'PLATINUM'])
  plan?: 'BASIC' | 'PROFESSIONAL' | 'PLATINUM';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedDocuments?: string[];
}
