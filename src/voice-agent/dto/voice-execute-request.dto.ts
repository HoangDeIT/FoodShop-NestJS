import { IsString, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ActionDto } from "./action.dto";

export class VoiceExecuteRequestDto {
    @IsString()
    message!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActionDto)
    feActions!: ActionDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActionDto)
    beActions!: ActionDto[];
}