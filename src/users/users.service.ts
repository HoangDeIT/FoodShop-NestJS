import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from 'src/decorator/customize';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { IUser } from './users.interface';
import { User as UserEntity, UserDocument } from './schemas/user.schema';
@Injectable()
export class UsersService {
  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  }
  constructor(@InjectModel(UserEntity.name) private userModel: SoftDeleteModel<UserDocument>) { }
  async create(createUserDto: CreateUserDto, @User() user: IUser) {
    const { name, email, password, address, role } = createUserDto;

    // 1. Kiểm tra email đã tồn tại chưa
    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(
        `Email: ${email} đã tồn tại trên hệ thống. Vui lòng sử dụng email khác.`
      );
    }

    // 2. Hash password
    const hashPassword = this.getHashPassword(password);

    // 3. Tạo user mới
    const newUser = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      address,
      role,
      createdBy: user && user._id ? {
        _id: user._id,
        email: user.email,
      } : null,
    });

    return newUser;
  }
  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
  findOneByUsername(username: string) {
    return this.userModel.findOne({ email: username });
  }
  isValidPassword(password: string, hash: string) {
    return compareSync(password, hash);
  }
}
