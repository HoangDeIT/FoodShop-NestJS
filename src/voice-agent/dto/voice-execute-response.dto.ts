import { IsString, IsArray, ValidateNested } from "class-validator";
import { ActionDto } from "./action.dto";
import { Type } from "class-transformer";

export class VoiceExecuteResponseDto {
    @IsString()
    message!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActionDto)
    actions!: ActionDto[];
}