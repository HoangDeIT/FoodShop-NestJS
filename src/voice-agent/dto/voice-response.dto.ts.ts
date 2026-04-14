// dto/voice-response.dto.ts
import { IsString, IsArray, ValidateNested, IsOptional, IsObject } from "class-validator";
import { Type } from "class-transformer";
import { ActionDto } from "./action.dto";

export class VoicePlanResponseDto {
    @IsString()
    message!: string;
    @IsString()
    currentPage!: string;

    @IsOptional()
    @IsObject()
    context?: Record<string, any>;
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActionDto)
    feActions!: ActionDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActionDto)
    beActions!: ActionDto[];
}