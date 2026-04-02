import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from './schemas/location.schema';
import { CustomerProfile, CustomerProfileSchema } from 'src/customer-profiles/schemas/customer-profile.schema';
import { SellerProfile, SellerProfileSchema } from 'src/seller-profiles/schemas/seller-profile.schema';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService],
  imports: [MongooseModule.forFeature([
    { name: Location.name, schema: LocationSchema },
    { name: CustomerProfile.name, schema: CustomerProfileSchema },
    { name: SellerProfile.name, schema: SellerProfileSchema }
  ])],
  exports: [LocationsService]
})
export class LocationsModule { }
