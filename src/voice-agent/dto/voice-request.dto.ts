// dto/voice-request.dto.ts
import { IsString, IsObject, IsOptional } from "class-validator";

export class VoiceRequestDto {
    @IsString()
    message!: string;

    @IsString()
    currentPage!: string;

    @IsOptional()
    @IsObject()
    context?: Record<string, any>;
}