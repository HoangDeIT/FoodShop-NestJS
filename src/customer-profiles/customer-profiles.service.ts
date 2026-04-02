import { Injectable } from '@nestjs/common';
import { CreateCustomerProfileDto } from './dto/create-customer-profile.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@Injectable()
export class CustomerProfilesService {
  create(createCustomerProfileDto: CreateCustomerProfileDto) {
    return 'This action adds a new customerProfile';
  }

  findAll() {
    return `This action returns all customerProfiles`;
  }

  findOne(id: number) {
    return `This action returns a #${id} customerProfile`;
  }

  update(id: number, updateCustomerProfileDto: UpdateCustomerProfileDto) {
    return `This action updates a #${id} customerProfile`;
  }

  remove(id: number) {
    return `This action removes a #${id} customerProfile`;
  }
}
