import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ShipperProfilesService } from './shipper-profiles.service';
import { CreateShipperProfileDto } from './dto/create-shipper-profile.dto';
import { UpdateShipperProfileDto } from './dto/update-shipper-profile.dto';

@Controller('shipper-profiles')
export class ShipperProfilesController {
  constructor(
    private readonly shipperProfilesService: ShipperProfilesService,
  ) { }

  @Post()
  create(@Body() createShipperProfileDto: CreateShipperProfileDto) {
    return this.shipperProfilesService.create(createShipperProfileDto);
  }

  @Get()
  findAll() {
    return this.shipperProfilesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shipperProfilesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateShipperProfileDto: UpdateShipperProfileDto,
  ) {
    return this.shipperProfilesService.update(+id, updateShipperProfileDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shipperProfilesService.remove(+id);
  }
}
