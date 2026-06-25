import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty() @IsString() plate: string;
  @ApiProperty({ enum: ['TRUCK', 'VAN', 'MOTORCYCLE'] })
  @IsEnum(['TRUCK', 'VAN', 'MOTORCYCLE'])
  type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() driverId?: string;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() plate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() driverId?: string;
  @ApiPropertyOptional() @IsOptional() isActive?: boolean;
}

export class ShipmentOrderLineDto {
  @ApiPropertyOptional() @IsOptional() @IsString() b2bOrderId?: string;
  @ApiProperty() @IsString() address: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sequence?: number;
}

export class CreateShipmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() plannedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() route?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentOrderLineDto)
  orders?: ShipmentOrderLineDto[];
}

export class UpdateShipmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() driverId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() plannedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() route?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
