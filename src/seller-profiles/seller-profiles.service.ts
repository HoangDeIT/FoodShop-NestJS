import { Injectable } from '@nestjs/common';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';

@Injectable()
export class SellerProfilesService {
  create(createSellerProfileDto: CreateSellerProfileDto) {
    return 'This action adds a new sellerProfile';
  }

  findAll() {
    return `This action returns all sellerProfiles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} sellerProfile`;
  }

  update(id: number, updateSellerProfileDto: UpdateSellerProfileDto) {
    return `This action updates a #${id} sellerProfile`;
  }

  remove(id: number) {
    return `This action removes a #${id} sellerProfile`;
  }
}
