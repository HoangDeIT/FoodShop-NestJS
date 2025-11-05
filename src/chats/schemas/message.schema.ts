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

    @Prop({ enum: ['text', 'image'], required: true })
    type: 'text' | 'image';

    @Prop({ required: true })
    data: string; // text hoặc image URL

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
