import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type LocationDocument = HydratedDocument<Location>;

@Schema({ timestamps: true })
export class Location {
    @Prop()
    latitude: number;
    @Prop()
    longitude: number;
    @Prop()
    address?: string;
    // GeoJSON cho $geoNear
    @Prop({
        type: { type: String, enum: ['Point'], default: 'Point' },
    })
    type: string;

    @Prop({
        type: [Number],
        index: '2dsphere',
        default: function (this: Location) {
            return [this.longitude, this.latitude];
        },
    })
    coordinates: number[];
}
export const LocationSchema = SchemaFactory.createForClass(Location);