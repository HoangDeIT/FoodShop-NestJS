// dto/action.dto.ts
import { IsString, IsOptional, IsObject } from "class-validator";

export class ActionDto {
    @IsString()
    id!: string;

    @IsString()
    type!: string;

    @IsOptional()
    @IsObject()
    payload?: Record<string, any>;

    // 👇 dùng cho execute phase
    @IsOptional()
    status?: "pending" | "success" | "failed";

    // 👇 log/debug
    @IsOptional()
    error?: string;
}