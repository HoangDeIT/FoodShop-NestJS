import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { MailService } from 'src/mail/mail.service';
import { LocationsService } from 'src/locations/locations.service';
import { LocationsModule } from 'src/locations/locations.module';
import { Review, ReviewSchema } from 'src/reviews/schemas/review.schema';
import { CustomerProfile, CustomerProfileSchema } from 'src/customer-profiles/schemas/customer-profile.schema';
import { Seller } from 'src/decorator/customize';
import { SellerProfile, SellerProfileSchema } from 'src/seller-profiles/schemas/seller-profile.schema';

@Module({
  controllers: [UsersController],
  providers: [UsersService, MailService],
  imports: [MongooseModule.forFeature([
    { name: User.name, schema: UserSchema },
    { name: Review.name, schema: ReviewSchema },
    { name: CustomerProfile.name, schema: CustomerProfileSchema },
    { name: SellerProfile.name, schema: SellerProfileSchema }
  ]), LocationsModule],
  exports: [UsersService],
})
export class UsersModule { }
