import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Product } from 'src/products/schemas/product.schema';
import { Location } from 'src/locations/schemas/location.schema';

export type OrderDocument = HydratedDocument<Order>;

/**
 * 🧩 Sản phẩm trong đơn hàng
 * (giống CartItem nhưng giá, topping, size được cố định lúc đặt)
 */
@Schema({ _id: true })
export class OrderItem {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Product.name, required: true })
    product: mongoose.Types.ObjectId;

    @Prop({ required: true })
    productName: string;

    @Prop({ required: true })
    basePrice: number;

    @Prop({ type: mongoose.Schema.Types.ObjectId })
    sizeId?: mongoose.Schema.Types.ObjectId;

    @Prop()
    sizeName?: string;

    @Prop({ type: [mongoose.Schema.Types.ObjectId], default: [] })
    toppingIds?: mongoose.Schema.Types.ObjectId[];

    @Prop({ type: [String], default: [] })
    toppingNames?: string[];

    @Prop({ required: true })
    quantity: number;

    @Prop({ required: true })
    totalPrice: number;

    @Prop()
    note?: string;

    @Prop()
    image?: string;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

/**
 * 🧾 Đơn hàng (chỉ chứa 1 shop duy nhất)
 */
@Schema({ timestamps: true })
export class Order {
    // Người mua
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    customer: mongoose.Types.ObjectId;

    // Shop được mua
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    shop: mongoose.Types.ObjectId;

    // Danh sách sản phẩm mua
    @Prop({ type: [OrderItemSchema], default: [] })
    items: OrderItem[];

    // Tổng tiền đơn hàng
    @Prop({ required: true, default: 0 })
    totalPrice: number;

    // Trạng thái đơn hàng
    @Prop({
        required: true,
        default: 'pending',
        enum: ['pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled'],
    })
    orderStatus: string;

    @Prop({ type: Types.ObjectId, ref: Location.name })
    deliveryAddress?: Location;

    @Prop({ default: '' })
    receiverName: string;

    @Prop({ default: '' })
    receiverPhone: string;

    // Ngày đặt & giao
    @Prop({ default: Date.now })
    orderDate: Date;

    @Prop()
    deliveredAt?: Date;

    // Khoảng cách (km)
    @Prop({ default: 0 })
    distance: number;
    // Phí ship
    @Prop({ default: 0 })
    shippingCost: number;
    // Ghi chú đơn hàng
    @Prop({ default: '' })
    note: string;

    // Soft delete flag
    @Prop({ default: false })
    isDeleted: boolean;
}
export const OrderSchema = SchemaFactory.createForClass(Order);
