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

export class PosLoginDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @MinLength(4)
  posPin: string;

  @ApiProperty({ example: 'tenant-id-here' })
  @IsString()
  tenantId: string;
}
