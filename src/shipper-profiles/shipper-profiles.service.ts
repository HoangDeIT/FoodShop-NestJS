import { Injectable } from '@nestjs/common';
import { CreateShipperProfileDto } from './dto/create-shipper-profile.dto';
import { UpdateShipperProfileDto } from './dto/update-shipper-profile.dto';

@Injectable()
export class ShipperProfilesService {
  create(createShipperProfileDto: CreateShipperProfileDto) {
    return 'This action adds a new shipperProfile';
  }

  findAll() {
    return `This action returns all shipperProfiles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} shipperProfile`;
  }

  update(id: number, updateShipperProfileDto: UpdateShipperProfileDto) {
    return `This action updates a #${id} shipperProfile`;
  }

  remove(id: number) {
    return `This action removes a #${id} shipperProfile`;
  }
}
