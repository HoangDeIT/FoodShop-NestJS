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
            type: { type: String, enum: ['text', 'image'] },
            data: String,
            senderId: { type: Types.ObjectId, ref: User.name },
            createdAt: Date,
        },
    })
    lastMessage?: {
        type: 'text' | 'image';
        data: string;
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
