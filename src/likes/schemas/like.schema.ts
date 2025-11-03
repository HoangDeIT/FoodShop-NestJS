import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';


export type LikeDocument = HydratedDocument<Like>;

@Schema({ timestamps: true })
export class Like {
    // Người dùng (customer) bấm thích
    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    user: Types.ObjectId;

    // Shop được thích (seller)
    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    shop: Types.ObjectId;

    // Có thể thêm cờ đánh dấu hoặc soft delete
    @Prop({ default: false })
    isDeleted: boolean;

    // Nếu muốn ghi nhận ai xóa (trong admin panel)
    @Prop({ type: Object })
    deletedBy?: {
        _id: Types.ObjectId;
        email: string;
    };

    @Prop()
    deletedAt?: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);
