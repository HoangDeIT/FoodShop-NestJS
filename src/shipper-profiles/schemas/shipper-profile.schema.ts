import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
export type ShipperProfileDocument = HydratedDocument<ShipperProfile>;
@Schema({ timestamps: true })
export class ShipperProfile {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ enum: ['bike', 'motorbike', 'car'], default: 'motorbike' })
  vehicleType: string;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  currentLocationId?: Types.ObjectId;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  currentOrderId?: Types.ObjectId;

  @Prop({ default: 0 })
  totalDelivered: number;

  @Prop({ default: 5 })
  rating: number;

  @Prop()
  lastActive?: Date;
}
export const ShipperProfileSchema =
  SchemaFactory.createForClass(ShipperProfile);
