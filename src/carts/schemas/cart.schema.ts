import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Product } from 'src/products/schemas/product.schema';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ _id: true })
export class CartItem {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Product.name, required: true })
    product: mongoose.Schema.Types.ObjectId;

    @Prop({ required: true })
    productName: string;

    @Prop({ required: true })
    basePrice: number;

    @Prop({ type: mongoose.Schema.Types.ObjectId })
    sizeId?: mongoose.Schema.Types.ObjectId;

    @Prop({ default: '' })
    sizeName?: string;

    @Prop({ type: [mongoose.Schema.Types.ObjectId], default: [] })
    toppingIds?: mongoose.Schema.Types.ObjectId[];

    @Prop({ type: [String], default: [] })
    toppingNames?: string[];

    @Prop({ required: true, min: 1 })
    quantity: number;

    @Prop({ required: true })
    totalPrice: number;

    @Prop({ default: '' })
    note: string;

    @Prop()
    image?: string;
}
export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ _id: false })
export class ShopCart {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    shop: mongoose.Types.ObjectId;

    @Prop({ type: [CartItemSchema], default: [] })
    items: CartItem[];

    @Prop({ default: 0 })
    totalPrice: number;
}
export const ShopCartSchema = SchemaFactory.createForClass(ShopCart);

@Schema({ timestamps: true })
export class Cart {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true, unique: true })
    customer: mongoose.Schema.Types.ObjectId;

    @Prop({ type: [ShopCartSchema], default: [] })
    shopCarts: ShopCart[];

    @Prop({ default: 0 })
    grandTotal: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
