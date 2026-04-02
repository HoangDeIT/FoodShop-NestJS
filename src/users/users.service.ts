import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from 'src/decorator/customize';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';
import { IUser } from './users.interface';
import { User as UserEntity, UserDocument } from './schemas/user.schema';
import aqp from 'api-query-params';
import mongoose, { isValidObjectId, Mongoose, Types } from 'mongoose';
import { isEmail } from 'class-validator';
import { CreateLocationDto } from 'src/locations/dto/create-location.dto';
import { LocationsService } from 'src/locations/locations.service';
import { isBuffer } from 'util';
import { Review, ReviewDocument } from 'src/reviews/schemas/review.schema';
import {
  CustomerProfile,
  CustomerProfileDocument,
} from 'src/customer-profiles/schemas/customer-profile.schema';
import {
  SellerProfile,
  SellerProfileDocument,
} from 'src/seller-profiles/schemas/seller-profile.schema';
import { UserRole } from './users.role.enum';
@Injectable()
export class UsersService {
  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  };
  constructor(
    @InjectModel(UserEntity.name)
    private userModel: SoftDeleteModel<UserDocument>,
    private readonly locationsService: LocationsService,
    @InjectModel(Review.name)
    private reviewModel: SoftDeleteModel<ReviewDocument>,
    @InjectModel(CustomerProfile.name)
    private customerProfileModel: SoftDeleteModel<CustomerProfileDocument>,
    @InjectModel(SellerProfile.name)
    private sellerProfileModel: SoftDeleteModel<SellerProfileDocument>,
  ) { }
  async create(createUserDto: CreateUserDto, actor?: IUser) {
    const { name, email, password, role, avatar, status } = createUserDto;

    // 1. Kiểm tra email đã tồn tại chưa
    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(
        `Email: ${email} đã tồn tại trên hệ thống. Vui lòng sử dụng email khác.`,
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
      createdBy: actor?._id
        ? {
          _id: actor._id,
          email: actor.email,
        }
        : null,
    });
    // 👉 tạo profile
    await this.createProfileByRole(newUser, actor);

    return newUser;
  }
  private async createProfileByRole(user: UserDocument, actor?: IUser) {
    switch (user.role) {

      case UserRole.SELLER:
        await this.sellerProfileModel.create({
          userId: user._id,
          shopName: user.name,
          createdBy: actor
            ? {
              _id: actor._id,
              email: actor.email,
            }
            : undefined,
        });
        break;

      case UserRole.CUSTOMER:
        await this.customerProfileModel.create({
          userId: user._id,
        });
        break;

      default:
        break;
    }
  }
  async findAll(currentPage = 1, limit = 10, qs: string) {
    const { filter, sort, population } = aqp(qs || '');
    delete filter.current;
    delete filter.pageSize;
    console.log('filter', filter);
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

  // async findOne(id: string) {
  //   const user = await this.userModel
  //     .findById(id)
  //     .select('-password')
  //     .populate('location')
  //     .lean();

  //   if (!user) return null;

  //   // Chỉ tính rating cho seller
  //   if (user.role !== 'seller') {
  //     return {
  //       ...user,
  //       rating: 0,
  //       reviewsCount: 0,
  //     };
  //   }

  //   const stats = await this.reviewModel.aggregate([
  //     { $match: { isDeleted: false } },

  //     // Join Product
  //     {
  //       $lookup: {
  //         from: 'products',
  //         localField: 'product',
  //         foreignField: '_id',
  //         as: 'productInfo'
  //       }
  //     },
  //     { $unwind: '$productInfo' },

  //     // Filter review thuộc seller này
  //     {
  //       $match: {
  //         'productInfo.seller': new mongoose.Types.ObjectId(id)
  //       }
  //     },

  //     // Group tính rating + count
  //     {
  //       $group: {
  //         _id: null,
  //         avgRating: { $avg: '$rating' },
  //         reviewsCount: { $sum: 1 }
  //       }
  //     }
  //   ]);

  //   return {
  //     ...user,
  //     rating: stats?.[0]?.avgRating ? Number(stats[0].avgRating.toFixed(1)) : 0,
  //     reviewsCount: stats?.[0]?.reviewsCount ?? 0,
  //   };
  // }

  async update(id: string, dto: UpdateUserDto, actor: IUser) {
    if (!isValidObjectId(id)) {
      console.log('>>>>check id', id);
      throw new BadRequestException('User không hợp lệ');
    }
    // delete dto.password;
    const updatePayload: any = {
      ...dto,
      updatedBy: actor ? { _id: actor._id, email: actor.email } : undefined,
    };
    if (dto.name) updatePayload.name = dto.name;
    if (dto.email) updatePayload.email = dto.email;
    if (dto.avatar) updatePayload.avatar = dto.avatar;
    if (dto.status) updatePayload.status = dto.status;
    if (dto.role) updatePayload.role = dto.role;

    if (dto.password) {
      updatePayload.password = this.getHashPassword((dto as any).password);
    }

    const res = await this.userModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .select('-password')
      .lean();


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
    if (found.role === 'admin') {
      throw new BadRequestException('Không thể xoá tài khoản admin');
    }
    const deletedBy = {
      _id: actor._id as unknown as mongoose.Schema.Types.ObjectId,
      email: actor.email,
    };
    await this.userModel.updateOne({ _id: id }, { deletedBy });

    return await this.userModel.softDelete({ _id: id });
  }

  async findOne(
    by: { id: string; email?: never } | { email: string; id?: never },
    options?: { password?: boolean },
  ) {
    const includePassword = options?.password === true;

    const query = this.userModel.findOne(
      'id' in by ? { _id: by.id } : { email: by.email },
    );

    if (!includePassword) {
      query.select('-password');
    }

    const user = await query.lean();
    if (!user) return null;

    let profile: SellerProfile | CustomerProfile | null = null;

    switch (user.role) {
      case UserRole.CUSTOMER:
        profile = await this.customerProfileModel
          .findOne({ userId: user._id })
          .populate('location')
          .lean();
        break;

      case UserRole.SELLER:
        profile = await this.sellerProfileModel
          .findOne({ userId: user._id })
          .populate('location')
          .lean();
        break;
    }

    return {
      user: { ...user },
      profile: profile
        ? {
          type: user.role,
          ...profile,
        }
        : null,
    };
  }

  // async findOneByEmail(username: string) {
  //   return await this.userModel.findOne({ email: username }).populate('location').select('-password');
  // }
  isValidPassword(password: string, hash: string) {
    return compareSync(password, hash);
  }
  // 🟢 cập nhật vị trí user (React Native gửi lat/lng)
  async updateLocation(userId: string, dto: CreateLocationDto) {

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    let profile: CustomerProfileDocument | SellerProfileDocument | null = null;

    // 1️⃣ lấy profile
    if (user.role === UserRole.CUSTOMER) {
      profile = await this.customerProfileModel.findOne({ userId: new Types.ObjectId(userId) });
    } else if (user.role === UserRole.SELLER) {
      profile = await this.sellerProfileModel.findOne({ userId: new Types.ObjectId(userId) });
    }

    if (!profile) throw new NotFoundException('Profile not found');

    const oldLocationId = profile.location;

    // 2️⃣ tạo location mới
    const newLocation = await this.locationsService.create(dto);

    // 3️⃣ update profile (✔ đúng chỗ)
    let updatedProfile;

    if (user.role === UserRole.CUSTOMER) {
      updatedProfile = await this.customerProfileModel
        .findByIdAndUpdate(
          profile._id,
          { location: newLocation._id },
          { new: true }
        )
        .populate('location');
    } else {
      updatedProfile = await this.sellerProfileModel
        .findByIdAndUpdate(
          profile._id,
          { location: newLocation._id },
          { new: true }
        )
        .populate('location');
    }

    // 4️⃣ xoá location cũ
    if (oldLocationId) {
      await this.locationsService.remove(oldLocationId as any);
    }

    return updatedProfile;
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

    let locationId: mongoose.Types.ObjectId | undefined;

    // update location
    if (dto.location) {
      const oldProfile = await this.sellerProfileModel
        .findOne({ userId: sellerId })
        .select('location');

      if (oldProfile?.location) {
        await this.locationsService.remove(
          oldProfile.location as unknown as string,
        );
      }

      const newLoc = await this.locationsService.create(dto.location);
      locationId = newLoc._id;
    }

    // 1️⃣ update user table
    await this.userModel.findByIdAndUpdate(
      sellerId,
      {
        name: dto.name,
        avatar: dto.avatar,
      },
      { new: true },
    );

    // 2️⃣ update seller_profile table
    const profileUpdate: any = {
      description: dto.description,
      isOpen: dto.isOpen,
      updatedBy: { _id: actor._id, email: actor.email },
    };

    if (locationId) profileUpdate.location = locationId;

    const updatedProfile = await this.sellerProfileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(sellerId) },
        profileUpdate,
        { new: true },
      )
      .populate('location');

    if (!updatedProfile)
      throw new BadRequestException('Không tìm thấy seller profile');

    return updatedProfile;
  }
  async saveExpoToken(userId: string, token: string) {
    const user = await this.customerProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('location');
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
