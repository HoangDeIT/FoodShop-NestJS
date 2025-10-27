import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { Auth, User } from 'src/decorator/customize';

@Controller('cart')
export class CartsController {
  constructor(private readonly cartService: CartsService) { }
  @Auth()
  @Get()
  async getCart(@User() user) {
    return this.cartService.getCartByUser(user._id);
  }
  @Auth()
  @Post(':shopId')
  async addToCart(
    @User() user,
    @Param('shopId') shopId: string,
    @Body() body: any,
  ) {
    const userId = user._id;
    return this.cartService.addToCart(userId, shopId, body);
  }
  @Auth()
  @Patch(':shopId/:itemId')
  async updateQuantity(
    @User() user,
    @Param('shopId') shopId: string,
    @Param('itemId') itemId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.updateQuantity(user._id, shopId, itemId, quantity);
  }
  @Auth()
  @Delete(':shopId/:itemId')
  async removeItem(
    @User() user,
    @Param('shopId') shopId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(user._id, shopId, itemId);
  }
  @Auth()
  @Delete(':shopId')
  async clearShopCart(@User() user, @Param('shopId') shopId: string) {
    return this.cartService.clearShopCart(user._id, shopId);
  }
}
