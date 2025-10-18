import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Location, LocationSchema } from './schemas/location.schema';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService],
  imports: [MongooseModule.forFeature([
    { name: Location.name, schema: LocationSchema }
  ])],
  exports: [LocationsService]
})
export class LocationsModule { }
