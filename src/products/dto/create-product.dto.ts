import {
    IsString,
    IsOptional,
    IsNumber,
    IsArray,
    ValidateNested,
    IsBoolean,
    Min,
    IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SizeDto {
    @IsString()
    name: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}

export class ToppingDto {
    @IsString()
    name: string;

    @IsNumber()
    @Min(0)
    price: number;
}

export class CreateProductDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsNumber()
    @Min(0)
    basePrice: number;
    @IsMongoId()
    category: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SizeDto)
    sizes?: SizeDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ToppingDto)
    toppings?: ToppingDto[];

    @IsOptional()
    @IsBoolean()
    inStock?: boolean;

    // ✅ Số lượng đã bán
    @IsOptional()
    @IsNumber()
    @Min(0)
    sold?: number;

    // ✅ Cờ bật/tắt món (Admin điều khiển)
    @IsOptional()
    @IsBoolean()
    isAvailable?: boolean;
}
