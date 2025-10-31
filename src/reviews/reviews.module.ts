import { Module } from '@nestjs/common';
import { ReviewService } from './reviews.service';
import { ReviewController } from './reviews.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './schemas/review.schema';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService],
  imports: [MongooseModule.forFeature([
    { name: Review.name, schema: ReviewSchema }
  ]), OrdersModule]
})
export class ReviewsModule { }
