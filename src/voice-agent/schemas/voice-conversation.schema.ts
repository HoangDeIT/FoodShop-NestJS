// voice/schemas/voice-conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type VoiceConversationDocument = HydratedDocument<VoiceConversation>;

@Schema({ timestamps: true })
export class VoiceConversation {
    @Prop({ type: Types.ObjectId, ref: "User", required: true })
    userId!: Types.ObjectId;

    @Prop({ required: true })
    sessionId!: string; // FE generate (uuid)

    @Prop({ default: "" })
    summary!: string; // future dùng (giờ có thể bỏ)


    @Prop()
    lastMessageAt!: Date;
}

export const VoiceConversationSchema =
    SchemaFactory.createForClass(VoiceConversation);