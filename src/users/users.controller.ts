import { Controller, Get, Post, Body, Patch, Param, Delete, Query, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Admin, Auth, Customer, Public, Seller, User } from 'src/decorator/customize';
import { MailService } from 'src/mail/mail.service';
import { CreateLocationDto } from 'src/locations/dto/create-location.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService,
    private readonly mailService: MailService
  ) { }
  @Admin()
  @Post()
  create(@Body() createUserDto: CreateUserDto, @User() user) {
    return this.usersService.create(createUserDto, user)
  }
  @Auth()
  @Post('expo-token')
  async saveExpoToken(@User() user, @Body('token') token: string) {
    return this.usersService.saveExpoToken(user._id, token);
  }
  @Get()
  @Admin()
  findAll(
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
    @Query() query?: Record<string, any>,
  ) {
    const qs = new URLSearchParams(query as any).toString();
    return this.usersService.findAll(Number(current) || 1, Number(pageSize) || 10, qs);
  }
  @Auth()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
  @Auth()
  @Patch('/location-update')
  updateProfile(@Body() dto: CreateLocationDto, @User() user) {
    return this.usersService.updateLocation(user._id, dto);;

  }
  @Seller()
  @Patch('seller/update')
  async updateSeller(
    @User() actor, // seller hiện tại
    @Body()
    body: {
      name: string;
      description?: string;
      avatar?: string;
      location?: CreateLocationDto;
      isOpen?: boolean;
    },
  ) {
    return this.usersService.updateSeller(actor._id, body, actor);
  }
  @Patch(':id')
  @Admin()
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @User() user) {
    return this.usersService.update(id, updateUserDto, user);
  }
  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string, @User() actor) {
    return this.usersService.remove(id, actor);
  }
  //////

  @Auth()
  @Get('sellers/nearby')
  async getNearbySellers(
    @User() actor,
    @Query('radius') radius?: string,
    @Query('current') current?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryId') categoryId?: string,
    @Query() query?: Record<string, any>,
  ) {
    const user = await this.usersService.findOneByEmail(actor.email);

    const latitude = parseFloat(user?.location?.latitude as any);
    const longitude = parseFloat(user?.location?.longitude as any);
    const radiusInKm = radius ? parseFloat(radius) : 10;
    const currentPage = parseInt(current || '1');
    const limit = parseInt(pageSize || '10');

    const hasLocation =
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) &&
      !isNaN(longitude);

    if (!hasLocation) {
      const qs = new URLSearchParams(query as any).toString();
      return this.usersService.findAll(currentPage, limit, qs);
    }

    return this.usersService.findSellersNearby(
      latitude,
      longitude,
      radiusInKm,
      currentPage,
      limit,
      categoryId,
    );
  }

}