import { IsString, IsArray, ValidateNested, IsObject, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { ActionDto } from "./action.dto";

export class VoiceExecuteRequestDto {
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
