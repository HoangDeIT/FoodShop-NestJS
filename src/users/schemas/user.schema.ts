import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { UserRole, UserStatus } from '../users.role.enum';
import { Location } from 'src/locations/schemas/location.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop()
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ enum: UserRole, required: true })
  role: UserRole;

  @Prop({ enum: UserStatus, required: true })
  status: UserStatus;

  @Prop()
  avatar: string;

  @Prop()
  OTP: string;

  @Prop()
  OTPExpired: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
