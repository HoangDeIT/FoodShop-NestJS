import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Auth, Customer, Seller, User } from 'src/decorator/customize';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }
  @Auth()
  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @User() user) {
    return this.ordersService.create(createOrderDto, user._id);
  }
  @Get()
  findAll(
    @Query('current') current?: number,
    @Query('pageSize') pageSize?: number,
    @Query() qs?: string, // truyền query string filter/sort từ FE
  ) {
    return this.ordersService.findAll(current, pageSize, qs);
  }
  @Customer()
  @Get('customer')
  findByCustomer(
    @User() customer,
    @Query('status') status?: string,
    @Query('current') current = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    // Truyền filter sẵn
    const qs = `customerId=${customer._id}${status ? `&status=${status}` : ''}`;
    return this.ordersService.findAll(current, pageSize, qs);
  }

  /** 🏪 API: Lấy đơn hàng của 1 shop */
  @Seller()
  @Get('seller')
  findByShop(
    @User() shop,
    @Query('status') status?: string,
    @Query('current') current = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    const qs = `shopId=${shop._id}${status ? `&status=${status}` : ''}`;
    return this.ordersService.findAll(current, pageSize, qs);
  }
  // API: Cập nhật trạng thái đơn hàng (chỉ seller được phép) */
  @Seller()
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @User() shop,
  ) {
    return this.ordersService.updateStatus(id, status, shop._id);
  }

}
