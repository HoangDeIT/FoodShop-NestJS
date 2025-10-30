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
  @Post('validate')
  async validateCart(@User() user, @Body() body) {
    return this.cartService.validateClientCart(body);
  }
}
