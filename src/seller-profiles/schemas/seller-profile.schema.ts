import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Location } from 'src/locations/schemas/location.schema';
export type SellerProfileDocument = HydratedDocument<SellerProfile>;
@Schema({ timestamps: true })
export class SellerProfile {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  shopName: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  location?: Location;

  @Prop({ default: false })
  isOpen: boolean;

  @Prop({ default: false })
  isOnline: boolean;
  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  orderCount: number;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  totalReviews: number;
  @Prop()
  lastActive?: Date;


  @Prop({ type: Object })
  createdBy?: {
    _id: Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy?: {
    _id: Types.ObjectId;
    email: string;
  };
}
export const SellerProfileSchema = SchemaFactory.createForClass(SellerProfile);
