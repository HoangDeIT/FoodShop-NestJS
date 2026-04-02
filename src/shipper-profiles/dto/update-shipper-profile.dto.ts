import { PartialType } from '@nestjs/mapped-types';
import { CreateShipperProfileDto } from './create-shipper-profile.dto';


export class UpdateShipperProfileDto extends PartialType(
  CreateShipperProfileDto,
) { }
