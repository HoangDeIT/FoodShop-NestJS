import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import { CreateLocationDto } from 'src/locations/dto/create-location.dto';
import { LocationsService } from 'src/locations/locations.service';
import { isBuffer } from 'util';
import { Review, ReviewDocument } from 'src/reviews/schemas/review.schema';
@Injectable()
export class UsersService {
  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  }
  constructor(@InjectModel(UserEntity.name) private userModel: SoftDeleteModel<UserDocument>,
    private readonly locationsService: LocationsService,
    @InjectModel(Review.name) private reviewModel: SoftDeleteModel<ReviewDocument>,

  ) { }
  async create(createUserDto: CreateUserDto, user?: IUser) {
    const { name, email, password, role, avatar, status } = createUserDto;

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
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .populate('location')
      .lean();

    if (!user) return null;

    // Chỉ tính rating cho seller
    if (user.role !== 'seller') {
      return {
        ...user,
        rating: 0,
        reviewsCount: 0,
      };
    }

    const stats = await this.reviewModel.aggregate([
      { $match: { isDeleted: false } },

      // Join Product
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },

      // Filter review thuộc seller này
      {
        $match: {
          'productInfo.seller': new mongoose.Types.ObjectId(id)
        }
      },

      // Group tính rating + count
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          reviewsCount: { $sum: 1 }
        }
      }
    ]);

    return {
      ...user,
      rating: stats?.[0]?.avgRating ? Number(stats[0].avgRating.toFixed(1)) : 0,
      reviewsCount: stats?.[0]?.reviewsCount ?? 0,
    };
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

  async findOneByUsername(username: string) {
    return await this.userModel.findOne({ email: username }).populate('location');
  }
  async findOneByEmail(username: string) {
    return await this.userModel.findOne({ email: username }).populate('location').select('-password');
  }
  isValidPassword(password: string, hash: string) {
    return compareSync(password, hash);
  }
  // 🟢 cập nhật vị trí user (React Native gửi lat/lng)
  async updateLocation(userId: string, dto: CreateLocationDto) {
    // 1️⃣ Tìm user hiện tại để lấy location cũ
    const oldUser = await this.userModel.findById(userId).select('location');
    if (!oldUser) throw new NotFoundException('User not found');

    const oldLocationId = oldUser.location;

    // 2️⃣ Tạo location mới
    const newLocation = await this.locationsService.create(dto);

    // 3️⃣ Gán location mới cho user
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { location: newLocation._id },
        { new: true },
      )
      .populate('location')
      .select('-password');

    if (!updatedUser) throw new NotFoundException('User not found after update');

    // 4️⃣ Xoá location cũ (nếu có)
    if (oldLocationId) {
      try {
        await this.locationsService.remove(oldLocationId as unknown as string);
      } catch (err) {
        console.warn(`⚠️ Không thể xoá location cũ: ${oldLocationId}`, err.message);
      }
    }

    // 5️⃣ Trả về user + location mới
    return updatedUser;
  }
  async updateSeller(
    sellerId: string,
    dto: {
      name: string;
      description?: string;
      avatar?: string;
      location?: CreateLocationDto;
      isOpen?: boolean;
    },
    actor: IUser,
  ) {
    if (!isValidObjectId(sellerId))
      throw new BadRequestException('ID không hợp lệ');

    // 1️⃣ Nếu có location thì tạo mới trong bảng location
    let locationId: mongoose.Types.ObjectId | undefined;
    if (dto.location) {
      const oldUser = await this.userModel.findById(sellerId);
      oldUser?.location && await this.locationsService.remove(oldUser?.location as unknown as string);
      const newLoc = await this.locationsService.create(dto.location);
      locationId = newLoc._id;
    }
    // if (dto.avatar === "" || dto.avatar === undefined) {
    //   delete dto.avatar
    // }
    // 2️⃣ Tạo payload update
    const updatePayload: any = {
      name: dto.name,
      description: dto.description,
      avatar: dto.avatar,
      updatedBy: { _id: actor._id, email: actor.email },
      isOpen: dto.isOpen,
    };

    if (locationId) updatePayload.location = locationId;

    // 3️⃣ Update
    const updated = await this.userModel
      .findByIdAndUpdate(sellerId, updatePayload, { new: true })
      .populate('location')
      .select('-password');

    if (!updated)
      throw new BadRequestException('Không tìm thấy user để cập nhật');

    return updated;
  }

  async saveExpoToken(userId: string, token: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    user.expoToken = token;
    await user.save();
    return { message: 'Lưu Expo Token thành công' };
  }
  async findSellersNearby(
    latitude: number,
    longitude: number,
    radiusInKm = 10,
    currentPage = 1,
    pageSize = 10,
    categoryId?: string,
  ) {
    return this.locationsService.findSellersNearby(
      latitude,
      longitude,
      radiusInKm,
      currentPage,
      pageSize,
      categoryId,
    );
  }
  async updateProfileUser(
    userId: string,
    dto: { name?: string; avatar?: string },
    actor: IUser,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const updatePayload: any = {
      updatedBy: { _id: actor._id, email: actor.email },
    };

    if (dto.name) updatePayload.name = dto.name;
    if (dto.avatar) updatePayload.avatar = dto.avatar;

    const updated = await this.userModel
      .findByIdAndUpdate(userId, updatePayload, { new: true })
      .select('-password');

    return updated;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // 1️⃣ kiểm tra mật khẩu cũ
    const isValid = this.isValidPassword(oldPassword, user.password);
    if (!isValid) throw new BadRequestException('Mật khẩu cũ không đúng');

    // 2️⃣ hash mật khẩu mới
    const hashed = this.getHashPassword(newPassword);

    user.password = hashed;
    await user.save();

    return { message: 'Đổi mật khẩu thành công' };
  }

}
