import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { UsersModule } from 'src/users/users.module';
import { LocationsModule } from 'src/locations/locations.module';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [MongooseModule.forFeature([
    { name: Product.name, schema: ProductSchema }
  ]), UsersModule, LocationsModule],
  exports: [ProductsService]
})
export class ProductsModule { }
