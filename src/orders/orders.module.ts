import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { LocationsModule } from 'src/locations/locations.module';
import { ProductsModule } from 'src/products/products.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { UsersModule } from 'src/users/users.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { CustomerProfile, CustomerProfileSchema } from 'src/customer-profiles/schemas/customer-profile.schema';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    MongooseModule.forFeature([{ name: CustomerProfile.name, schema: CustomerProfileSchema }]),
    LocationsModule,
    ProductsModule, // ✅ inject được ProductsService
    UsersModule, // ✅ inject được UsersService
    NotificationsModule
  ],
  exports: [OrdersService],
})
export class OrdersModule { }
