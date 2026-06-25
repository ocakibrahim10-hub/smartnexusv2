import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
}

export class ProductUnitDto {
  @IsString() unit: string;
  @IsNumber() @Min(0.0001) factorToBase: number;
  @IsOptional() @IsBoolean() isPurchaseUnit?: boolean;
  @IsOptional() @IsBoolean() isSaleUnit?: boolean;
  @IsOptional() @IsString() barcode?: string;
}

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsEnum(ProductType) @IsOptional() type?: ProductType;
  @IsString() unit: string;
  @IsOptional() @IsString() saleUnit?: string;
  @IsNumber() @Min(0) salePrice: number;
  @IsNumber() @Min(0) @IsOptional() purchasePrice?: number;
  @IsNumber() @IsOptional() vatRate?: number;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsNumber() @Min(0) @IsOptional() minStock?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductUnitDto)
  units?: ProductUnitDto[];
}
