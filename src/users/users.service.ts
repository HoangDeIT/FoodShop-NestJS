import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from 'src/decorator/customize';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { IUser } from './users.interface';
import { User as UserEntity, UserDocument } from './schemas/user.schema';
import aqp from 'api-query-params';
import mongoose, { isValidObjectId, Types } from 'mongoose';
import { isEmail } from 'class-validator';
@Injectable()
export class UsersService {
  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  }
  constructor(@InjectModel(UserEntity.name) private userModel: SoftDeleteModel<UserDocument>) { }
  async create(createUserDto: CreateUserDto, user?: IUser) {
    const { name, email, password, address, role, avatar, status } = createUserDto;

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
      avatar,
      status,
      createdBy: user && user._id ? {
        _id: user._id,
        email: user.email,
      } : null,
    });

    return newUser;
  }


  async findAll(currentPage = 1, limit = 10, qs: string) {
    const { filter, sort, population } = aqp(qs || '');
    delete filter.current;
    delete filter.pageSize;
    console.log("filter", filter)
    const page = Math.max(1, +currentPage || 1);
    const pageSize = Math.max(1, +limit || 10);
    const offset = (page - 1) * pageSize;

    // Đếm số lượng trước, chỉ lấy count
    const totalItems = await this.userModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / pageSize);

    // Lấy data thật với skip/limit
    const query = this.userModel
      .find(filter)
      .skip(offset)
      .limit(pageSize)
      .sort(sort as any)
      .select('-password');

    if (population) {
      query.populate(population as any);
    }

    const result = await query.exec();

    return {
      meta: {
        current: page,
        pageSize,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };

  }

  async findOne(id: string) {
    return this.userModel.findById(id).select('-password');
  }

  async update(id: string, dto: UpdateUserDto, actor: IUser) {
    if (!isValidObjectId(id)) {
      console.log(">>>>check id", id)
      throw new BadRequestException('User không hợp lệ');
    }
    // delete dto.password;
    const updatePayload: any = {
      ...dto,
      updatedBy: actor ? { _id: actor._id, email: actor.email } : undefined,
    };

    if (dto.password) {
      updatePayload.password = this.getHashPassword((dto as any).password);
    }

    const res = await this.userModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .select('-password');

    if (!res) throw new BadRequestException('Không tìm thấy user để cập nhật');
    return res;
  }
  async remove(id: string, actor: IUser) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('User không hợp lệ');
    }

    const found = await this.userModel.findById(id);
    if (!found) {
      throw new BadRequestException('Không tìm thấy user để xoá');
    }
    if (found.role === "admin") {
      throw new BadRequestException('Không thể xoá tài khoản admin');
    }
    const deletedBy = { _id: actor._id as unknown as mongoose.Schema.Types.ObjectId, email: actor.email }!;
    await this.userModel.updateOne(
      { _id: id },
      { deletedBy }

    );


    return await this.userModel.softDelete({ _id: id });
  }

  findOneByUsername(username: string) {
    return this.userModel.findOne({ email: username });
  }
  isValidPassword(password: string, hash: string) {
    return compareSync(password, hash);
  }

}
