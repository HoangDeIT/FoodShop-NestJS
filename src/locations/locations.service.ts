import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Location, LocationDocument } from './schemas/location.schema';

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(Location.name) private readonly locationModel: SoftDeleteModel<LocationDocument>,
  ) { }

  async create(dto: CreateLocationDto) {
    const doc = await this.locationModel.create({
      ...dto,
      coordinates: [dto.longitude, dto.latitude],
    });
    return doc;
  }

  findAll() {
    return `This action returns all locations`;
  }

  async findById(id: string) {
    const loc = await this.locationModel.findById(id);
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  update(id: number, updateLocationDto: UpdateLocationDto) {
    return `This action updates a #${id} location`;
  }

  async remove(id: string) {
    const location = await this.locationModel.findByIdAndDelete(id);
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }
}
