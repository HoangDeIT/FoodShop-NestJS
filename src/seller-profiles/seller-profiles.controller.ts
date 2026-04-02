import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SellerProfilesService } from './seller-profiles.service';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';

@Controller('seller-profiles')
export class SellerProfilesController {
  constructor(private readonly sellerProfilesService: SellerProfilesService) {}

  @Post()
  create(@Body() createSellerProfileDto: CreateSellerProfileDto) {
    return this.sellerProfilesService.create(createSellerProfileDto);
  }

  @Get()
  findAll() {
    return this.sellerProfilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sellerProfilesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSellerProfileDto: UpdateSellerProfileDto,
  ) {
    return this.sellerProfilesService.update(+id, updateSellerProfileDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sellerProfilesService.remove(+id);
  }
}
