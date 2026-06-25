import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWarehouseDto {
  @IsString() name: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() isDefault?: boolean;
}

export class StockMovementDto {
  @IsString() productId: string;
  @IsString() warehouseId: string;
  @IsNumber() @Min(0.001) quantity: number;
  @IsEnum(['IN', 'OUT', 'ADJUST', 'COUNT']) type: string;
  @IsOptional() @IsString() inputUnit?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) unitCost?: number;
}

export class TransferLineDto {
  @IsString() productId: string;
  @IsNumber() @Min(0.001) quantity: number;
  @IsOptional() @IsString() inputUnit?: string;
}

export class CreateStockRequestDto {
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() expectedDate?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines: TransferLineDto[];
}

export class CreateTransferDto {
  @IsString() toTenantId: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() expectedDate?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines: TransferLineDto[];
}

export class StockCountDto {
  @IsString() warehouseId: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountLineDto)
  lines: CountLineDto[];
  @IsOptional() @IsString() notes?: string;
}

export class CountLineDto {
  @IsString() productId: string;
  @IsNumber() @Min(0) countedQty: number;
}
