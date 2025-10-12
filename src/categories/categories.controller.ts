import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Admin, Public, User } from 'src/decorator/customize';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Admin()
  @Post()
  create(@Body() dto: CreateCategoryDto, @User() actor) {
    return this.categoriesService.create(dto, actor);
  }

  @Public()
  @Get()
  findAll(
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
    @Query() query?: Record<string, any>,
  ) {
    const qs = new URLSearchParams(query as any).toString();
    return this.categoriesService.findAll(
      Number(current) || 1,
      Number(pageSize) || 10,
      qs,
    );
  }

  @Public()
  @Get('all')
  async findAllNoPaging() {
    return this.categoriesService.findAllNoPaging();
  }


  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @User() actor) {
    return this.categoriesService.update(id, dto, actor);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string, @User() actor) {
    return this.categoriesService.remove(id, actor);
  }
}
