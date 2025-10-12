import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Category } from 'src/categories/schemas/category.schema';
import { User } from 'src/users/schemas/user.schema';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
    @Prop({ required: true })
    name: string;

    @Prop()
    description: string;

    @Prop()
    image: string;

    @Prop({ required: true })
    basePrice: number;

    @Prop({
        type: [
            {
                _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
                name: { type: String, required: true },
                price: { type: Number, default: 0 },
                isDefault: { type: Boolean, default: false },
            },
        ],
        default: [],
    })
    sizes: {
        _id: mongoose.Schema.Types.ObjectId;
        name: string;
        price: number;
        isDefault: boolean;
    }[];

    @Prop({
        type: [
            {
                _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
                name: { type: String, required: true },
                price: { type: Number, default: 0 },
            },
        ],
        default: [],
    })
    toppings: {
        _id: mongoose.Schema.Types.ObjectId;
        name: string;
        price: number;
    }[];
    @Prop({ default: true })
    inStock: boolean;
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Category.name, required: true })
    category: mongoose.Schema.Types.ObjectId;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
    seller: mongoose.Schema.Types.ObjectId;
    @Prop({ type: Number, default: 0 })
    sold: number;


    @Prop({ type: Object })
    createdBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    };

    @Prop({ type: Object })
    updatedBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    };

    @Prop({ type: Object })
    deletedBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    };

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;

    @Prop()
    isDeleted: boolean;

    @Prop()
    deletedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
