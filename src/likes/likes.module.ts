import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Like, LikeSchema } from './schemas/like.schema';
import { UsersModule } from 'src/users/users.module';
import { SellerProfile, SellerProfileSchema } from 'src/seller-profiles/schemas/seller-profile.schema';

@Module({
  controllers: [LikesController],
  providers: [LikesService],
  imports: [MongooseModule.forFeature([
    { name: Like.name, schema: LikeSchema },
    { name: SellerProfile.name, schema: SellerProfileSchema }
  ]), UsersModule],
})
export class LikesModule { }
