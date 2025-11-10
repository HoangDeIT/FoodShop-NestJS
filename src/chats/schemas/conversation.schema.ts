import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true })
export class Conversation {
    @Prop({ type: [{ type: Types.ObjectId, ref: User.name }], required: true })
    participants: Types.ObjectId[]; // [userA, userB]
    @Prop({
        type: {
            type: {
                type: String,
                enum: ['text', 'image', 'store', 'product', 'ai_text'],
                default: 'text',
            },
            data: mongoose.Schema.Types.Mixed, // cho phép string hoặc object JSON
            senderId: { type: Types.ObjectId, ref: User.name },
            createdAt: Date,
        },
    })
    lastMessage?: {
        type: 'text' | 'image' | 'store' | 'product' | 'ai_text';
        data: any; // có thể là string hoặc object { intent, message, data }
        senderId: Types.ObjectId;
        createdAt: Date;
    };

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

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
