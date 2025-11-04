
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { UserRole, UserStatus } from '../users.role.enum';
import { Location } from 'src/locations/schemas/location.schema';



export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
    @Prop()
    name: string;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop()
    address: string;

    @Prop({ enum: UserRole, required: true })
    role: UserRole;
    @Prop({ enum: UserStatus, required: true })
    status: UserStatus;

    @Prop()
    active: boolean;

    @Prop()
    description: string;

    @Prop()
    OTP: string;

    @Prop({ default: false })
    isOpen: boolean;

    @Prop()
    avatar: string;
    @Prop()
    OTPExpired: Date;
    @Prop({ type: Types.ObjectId, ref: Location.name })
    location?: Location;
    @Prop()
    expoToken?: string;
    @Prop({ type: Object })
    createdBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    }

    @Prop({ type: Object })
    updatedBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    }

    @Prop({ type: Object })
    deletedBy: {
        _id: mongoose.Schema.Types.ObjectId;
        email: string;
    }

    @Prop()
    createdAt: Date;

    @Prop()
    updatedAt: Date;

    @Prop()
    isDeleted: boolean;

    @Prop()
    deletedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
