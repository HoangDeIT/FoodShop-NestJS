// src/locations/dto/create-location.dto.ts
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLocationDto {
    @IsNumber()
    latitude: number;

    @IsNumber()
    longitude: number;

    @IsOptional()
    @IsString()
    address?: string;
}
