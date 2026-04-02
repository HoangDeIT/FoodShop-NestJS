import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Location } from 'src/locations/schemas/location.schema';
import { User } from 'src/users/schemas/user.schema';
export type CustomerProfileDocument = HydratedDocument<CustomerProfile>;
@Schema({ timestamps: true })
export class CustomerProfile {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Location.name })
  location?: Location;

  @Prop()
  expoToken?: string;
  @Prop({ default: false })
  isOnline: boolean;

  @Prop()
  lastActive?: Date;
}
export const CustomerProfileSchema =
  SchemaFactory.createForClass(CustomerProfile);
