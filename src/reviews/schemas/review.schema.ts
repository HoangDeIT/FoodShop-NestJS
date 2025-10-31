import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Product } from 'src/products/schemas/product.schema';
import { Order } from 'src/orders/schemas/order.schema';

export type ReviewDocument = HydratedDocument<Review>;

/**
 * 💬 Subdocument: Reply (phản hồi cho review)
 */
@Schema({ _id: true, timestamps: true })
export class ReviewReply {
    // Người phản hồi (có thể là shop hoặc khách)
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    user: mongoose.Types.ObjectId;

    // Nội dung phản hồi
    @Prop({ required: true, trim: true })
    comment: string;

    // Soft delete flag
    @Prop({ default: false })
    isDeleted: boolean;
}
export const ReviewReplySchema = SchemaFactory.createForClass(ReviewReply);

/**
 * 🌟 Review chính
 */
@Schema({ timestamps: true })
export class Review {
    // Người viết review
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    user: mongoose.Types.ObjectId;

    // Sản phẩm được review
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Product.name, required: true })
    product: mongoose.Types.ObjectId;

    // Đơn hàng tương ứng (chỉ được review khi completed)
    // @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Order.name, required: true })
    // order: mongoose.Types.ObjectId;

    // Số sao (1–5)
    @Prop({ required: true, min: 1, max: 5 })
    rating: number;

    // Nội dung đánh giá
    @Prop({ required: true, trim: true })
    comment: string;

    // Danh sách ảnh của review
    @Prop({ type: [String], default: [] })
    images: string[];

    // Danh sách phản hồi
    @Prop({ type: [ReviewReplySchema], default: [] })
    replies: ReviewReply[];

    // Soft delete
    @Prop({ default: false })
    isDeleted: boolean;
}
export const ReviewSchema = SchemaFactory.createForClass(Review);
