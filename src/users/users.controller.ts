import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Admin, Auth, Customer, Public, Seller, User } from 'src/decorator/customize';
import { MailService } from 'src/mail/mail.service';

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
  @Admin()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
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

}
