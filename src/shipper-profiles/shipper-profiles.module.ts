import { Module } from '@nestjs/common';
import { ShipperProfilesService } from './shipper-profiles.service';
import { ShipperProfilesController } from './shipper-profiles.controller';

@Module({
  controllers: [ShipperProfilesController],
  providers: [ShipperProfilesService],
})
export class ShipperProfilesModule {}
