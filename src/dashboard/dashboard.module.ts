import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Order, OrderSchema } from 'src/orders/schemas/order.schema';
import { Product, ProductSchema } from 'src/products/schemas/product.schema';
import { Review, ReviewSchema } from 'src/reviews/schemas/review.schema';
import { Like, LikeSchema } from 'src/likes/schemas/like.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Like.name, schema: LikeSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule { }
