import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { MailService } from 'src/mail/mail.service';
import { LocationsService } from 'src/locations/locations.service';
import { LocationsModule } from 'src/locations/locations.module';

@Module({
  controllers: [UsersController],
  providers: [UsersService, MailService],
  imports: [MongooseModule.forFeature([
    { name: User.name, schema: UserSchema }
  ]), LocationsModule],
  exports: [UsersService],
})
export class UsersModule { }
