import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schemas/cart.schema';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';

import { ProductsModule } from 'src/products/products.module';

@Module({
  controllers: [CartsController],
  providers: [CartsService],
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    ProductsModule
  ],
})
export class CartsModule { }
