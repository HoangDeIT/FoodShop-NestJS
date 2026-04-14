// voice/schemas/voice-message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VoiceMessageDocument = HydratedDocument<VoiceMessage>;

export enum VoiceRole {
    USER = "user",
    ASSISTANT = "assistant",
}

@Schema({ timestamps: true })
export class VoiceMessage {
    @Prop({ type: Types.ObjectId, ref: "VoiceConversation", required: true })
    conversationId!: Types.ObjectId;

    @Prop({ enum: VoiceRole, required: true })
    role!: VoiceRole;

    @Prop({ required: true })
    message!: string;

    // 👉 lưu actions đã trả về
    @Prop({ type: Array })
    actions?: {
        type: string;
        payload?: Record<string, any>;
    }[];

    // 👉 trạng thái thực thi
    @Prop({ enum: ["success", "failed"], default: "success" })
    status!: string;
}

export const VoiceMessageSchema =
    SchemaFactory.createForClass(VoiceMessage);