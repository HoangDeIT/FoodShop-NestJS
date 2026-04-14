import { IsString, IsArray } from "class-validator";

export class VoiceExecuteResponseDto {
    @IsString()
    message!: string;

    @IsArray()
    results!: any[];
}