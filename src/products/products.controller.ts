import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Admin, Auth, Public, Seller, User } from 'src/decorator/customize';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Seller()
  @Post()
  create(@Body() dto: CreateProductDto, @User() actor) {
    return this.productsService.create(dto, actor);
  }

  @Admin()
  @Get()
  findAll(
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
    @Query() query?: Record<string, any>,
  ) {
    const qs = new URLSearchParams(query as any).toString();
    return this.productsService.findAll(Number(current) || 1, Number(pageSize) || 10, qs);
  }
  @Seller()
  @Get("categories")
  getSellerCategories(@User() actor) {
    return this.productsService.findSellerCategories(actor._id);
  }
  @Seller()
  @Get('mine')
  findAllBySeller(
    @User() seller,
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
    @Query() query?: Record<string, any>,
  ) {
    // 🧩 ép kiểu về string để thêm query mới
    const modifiedQuery = { ...query, seller: seller._id.toString() };

    // 🔄 tái sử dụng logic y chang findAll()
    const qs = new URLSearchParams(modifiedQuery as any).toString();
    return this.productsService.findAll(Number(current) || 1, Number(pageSize) || 10, qs);
  }

  @Auth()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
  @Seller() // hoặc @Admin() nếu bạn muốn admin cũng có quyền
  @Patch(':id/active')
  toggleActive(
    @Param('id') id: string,
    @Body('inStock') inStock: boolean,
    @User() actor,
  ) {
    return this.productsService.toggleActive(id, inStock, actor);
  }
  @Seller()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @User() actor) {
    return this.productsService.update(id, dto, actor);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string, @User() actor) {
    return this.productsService.remove(id, actor);
  }


}
