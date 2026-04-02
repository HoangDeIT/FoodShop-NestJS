import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CustomerProfilesService } from './customer-profiles.service';
import { CreateCustomerProfileDto } from './dto/create-customer-profile.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@Controller('customer-profiles')
export class CustomerProfilesController {
  constructor(
    private readonly customerProfilesService: CustomerProfilesService,
  ) {}

  @Post()
  create(@Body() createCustomerProfileDto: CreateCustomerProfileDto) {
    return this.customerProfilesService.create(createCustomerProfileDto);
  }

  @Get()
  findAll() {
    return this.customerProfilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerProfilesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerProfileDto: UpdateCustomerProfileDto,
  ) {
    return this.customerProfilesService.update(+id, updateCustomerProfileDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerProfilesService.remove(+id);
  }
}
