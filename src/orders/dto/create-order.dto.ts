import { IsArray, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateLocationDto } from 'src/locations/dto/create-location.dto';

export class CartItemDto {
    @IsMongoId()
    productId: string;

    @IsOptional()
    @IsMongoId()
    sizeId?: string;

    @IsOptional()
    @IsArray()
    toppingIds?: string[];

    @IsNumber()
    quantity: number;
}

export class CreateOrderDto {

    @IsMongoId()
    shopId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CartItemDto)
    items: CartItemDto[];

    @IsOptional()
    @IsString()
    note?: string;
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateLocationDto)
    location?: CreateLocationDto;
    @IsOptional()
    @IsMongoId()
    deliveryAddressId?: string;

    @IsOptional()
    @IsString()
    receiverName?: string;

    @IsOptional()
    @IsString()
    receiverPhone?: string;
}
