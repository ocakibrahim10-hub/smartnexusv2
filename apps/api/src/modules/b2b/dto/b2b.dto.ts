import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class B2BOrderLineDto {
  @ApiProperty() @IsString() productId: string;
  @ApiProperty() @IsNumber() quantity: number;
  @ApiProperty() @IsNumber() unitPrice: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() vatRate?: number;
}

export class CreateB2BOrderDto {
  @ApiProperty() @IsString() contactId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [B2BOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => B2BOrderLineDto)
  lines: B2BOrderLineDto[];
}

export class UpdateB2BOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => B2BOrderLineDto)
  lines?: B2BOrderLineDto[];
}

export class CreatePriceListDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
}
