import { PartialType } from '@nestjs/mapped-types';
import { CreateSellerProfileDto } from './create-seller-profile.dto';

export class UpdateSellerProfileDto extends PartialType(
  CreateSellerProfileDto,
) {}
