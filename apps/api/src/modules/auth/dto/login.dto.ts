import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@smartnexus.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SmartNexus2026!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: ['nexusadmin', 'bayi', 'isletme'] })
  @IsOptional()
  @IsIn(['nexusadmin', 'bayi', 'isletme'])
  panel?: 'nexusadmin' | 'bayi' | 'isletme';
}

export class PhoneLoginDto {
  @ApiProperty({ example: '5321234567' })
  @IsString()
  @MinLength(10)
  phone: string;

  @ApiProperty({ example: 'Isletme2026!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: ['nexusadmin', 'bayi', 'isletme'] })
  @IsOptional()
  @IsIn(['nexusadmin', 'bayi', 'isletme'])
  panel?: 'nexusadmin' | 'bayi' | 'isletme';
}

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

  @ApiProperty({ example: 'GucluSifre2026!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxNo?: string;
}
