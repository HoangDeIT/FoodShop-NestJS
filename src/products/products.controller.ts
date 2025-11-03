import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Admin, Auth, Customer, Public, Seller, User } from 'src/decorator/customize';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Seller()
  @Post()
  create(@Body() dto: CreateProductDto, @User() actor) {
    return this.productsService.create(dto, actor);
  }

  @Public()
  @Get()
  findAll(
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
    @Query() query?: Record<string, any>,
  ) {
    const qs = new URLSearchParams(query as any).toString();
    return this.productsService.findAll(Number(current) || 1, Number(pageSize) || 10, qs);
  }
  @Customer()
  @Get('search-near')
  async searchNearestProducts(
    @User() user,
    @Query('keyword') keyword: string,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.searchNearestProducts(user._id, keyword, Number(limit) || 15);
  }
  @Customer()
  @Get("types")
  async findNearbySellerTypes(@User() actor) {
    return this.productsService.findNearbySellerTypes(actor._id);
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
  @Get('sellers-with-products')
  async findSellersWithProductsNearby(
    @User() actor,
    @Query('currentPage') currentPage?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryId') categoryId?: string,

  ) {
    const page = currentPage ? parseInt(currentPage) : 1;
    const size = pageSize ? parseInt(pageSize) : 10;
    return await this.productsService.findSellerProductsNearby(
      actor._id,
      10,
      page,
      size,
      categoryId,
    );
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
