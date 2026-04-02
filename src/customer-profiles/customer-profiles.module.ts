import { Module } from '@nestjs/common';
import { CustomerProfilesService } from './customer-profiles.service';
import { CustomerProfilesController } from './customer-profiles.controller';

@Module({
  controllers: [CustomerProfilesController],
  providers: [CustomerProfilesService],
})
export class CustomerProfilesModule {}
