import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Conversation } from './conversation.schema';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
    @Prop({ type: Types.ObjectId, ref: Conversation.name, required: true })
    conversationId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    senderId: Types.ObjectId;

    @Prop({ enum: ['text', 'image', 'store', 'product', 'ai_text'], required: true })
    type: 'text' | 'image' | 'store' | 'product' | 'ai_text';

    @Prop({ type: mongoose.Schema.Types.Mixed })
    data: string | {
        intent: string;
        message: string;
        data?: any;
    };

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop()
    deletedAt?: Date;

    @Prop({ type: Object })
    createdBy?: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    };

    @Prop({ type: Object })
    updatedBy?: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    };

    @Prop({ type: Object })
    deletedBy?: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    };
}

export const MessageSchema = SchemaFactory.createForClass(Message);
