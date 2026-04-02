import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { UserRole } from 'src/users/users.role.enum';
import { UsersService } from 'src/users/users.service';
import { Like, LikeDocument } from './schemas/like.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { User } from 'src/users/schemas/user.schema';
import { calculateDistance } from 'src/utils/distance';
import aqp from 'api-query-params';
import { SellerProfile, SellerProfileDocument } from 'src/seller-profiles/schemas/seller-profile.schema';


@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private readonly likeModel: SoftDeleteModel<LikeDocument>,
    private readonly userService: UsersService,
    @InjectModel(SellerProfile.name) private readonly sellerProfileModel: SoftDeleteModel<SellerProfileDocument>,
  ) { }

  // 🟢 Thích shop
  async likeShop(userId: string, shopId: string) {
    if (userId === shopId)
      throw new BadRequestException('Bạn không thể tự like chính mình.');

    const shop = await this.userService.findOne({ id: shopId });
    if (!shop || shop.user.role !== UserRole.SELLER)
      throw new NotFoundException('Shop không tồn tại hoặc không hợp lệ.');

    // ✅ ép kiểu về ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const existing = await this.likeModel.findOne({
      user: userObjectId,
      shop: shopObjectId,
    });

    if (existing) throw new BadRequestException('Bạn đã like shop này rồi.');

    const like = await this.likeModel.create({
      user: userObjectId,
      shop: shopObjectId,
    });

    return { message: 'Đã like shop thành công.', like };
  }

  // 🔴 Bỏ thích
  async unlikeShop(userId: string, shopId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const deleted = await this.likeModel.findOneAndDelete({
      user: userObjectId,
      shop: shopObjectId,
    });

    if (!deleted) throw new NotFoundException('Bạn chưa like shop này.');
    return { message: 'Đã bỏ like shop.' };
  }

  // 📊 Lấy danh sách người đã like shop
  async getLikesByShop(shopId: string) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const likes = await this.likeModel
      .find({ shop: shopObjectId })
      .populate('user', 'name email avatar')
      .lean();

    return likes;
  }

  // 📈 Đếm số lượng like
  async countLikes(shopId: string) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    return this.likeModel.countDocuments({ shop: shopObjectId });
  }

  // 🔍 Kiểm tra user đã like chưa
  async isLiked(userId: string, shopId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const existing = await this.likeModel.findOne({
      user: userObjectId,
      shop: shopObjectId,
    });
    console.log(!!existing)
    return !!existing;
  }

  // 📋 Lấy danh sách các shop mà user đã like
  async getLikedShopsByUser(userId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1️⃣ lấy likes + shop
    const likes = await this.likeModel
      .find({ user: userObjectId })
      .populate({
        path: 'shop',
        select: 'name email avatar role status',
      })
      .lean();

    const shopIds = likes
      .map(l => (l.shop as any)?._id)
      .filter(Boolean);

    // 2️⃣ lấy seller profile + location
    const profiles = await this.sellerProfileModel
      .find({ userId: { $in: shopIds } })
      .populate('location')
      .lean();

    const profileMap = new Map(
      profiles.map(p => [p.userId.toString(), p])
    );

    // 3️⃣ lấy location của current user
    const currentUser = await this.userService.findOne({ id: userId });

    // 4️⃣ map result
    const result = likes
      .filter(l => l.shop && (l.shop as any).role === 'seller')
      .map(l => {
        const shop = l.shop as any;
        const profile = profileMap.get(shop._id.toString());

        let distance = 0;

        if (
          currentUser?.profile?.location &&
          profile?.location
        ) {
          distance = calculateDistance(
            currentUser.profile.location.latitude,
            currentUser.profile.location.longitude,
            profile.location.latitude,
            profile.location.longitude,
          );
        }

        return {
          _id: shop._id,
          name: shop.name,
          avatar: shop.avatar,
          email: shop.email,

          description: profile?.description,
          isOpen: profile?.isOpen,

          distance,
          isLike: true,
        };
      });

    return result;
  }

  async findAllLikesByUser(
    userId: string,
    currentPage = 1,
    limit = 10,
    qs: string,
  ) {
    const { filter, sort, population } = aqp(qs || '');
    delete filter.current;
    delete filter.pageSize;

    const page = Math.max(1, +currentPage || 1);
    const pageSize = Math.max(1, +limit || 10);
    const offset = (page - 1) * pageSize;

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const baseFilter = { user: userObjectId, ...filter };

    const totalItems = await this.likeModel.countDocuments(baseFilter);
    const totalPages = Math.ceil(totalItems / pageSize);

    // 👉 lấy user + profile
    const currentUser = await this.userService.findOne({ id: userId });

    const query = this.likeModel
      .find(baseFilter)
      .populate({
        path: 'shop',
        select: 'name email avatar role status',
      })
      .skip(offset)
      .limit(pageSize)
      .sort(sort as any)
      .lean();

    if (population) {
      query.populate(population as any);
    }

    const result = await query.exec();

    // 🔥 lấy profile của shop
    const shopIds = result.map(l => l.shop?._id).filter(Boolean);

    const sellerProfiles = await this.sellerProfileModel
      .find({ userId: { $in: shopIds } })
      .populate('location')
      .lean();

    const profileMap = new Map(
      sellerProfiles.map(p => [p.userId.toString(), p])
    );

    // 🧮 map dữ liệu + tính distance
    const shops = result
      .filter(l => {
        const shop = l.shop as unknown as User;
        return shop && shop.role === "seller";
      })
      .map(l => {
        const shop = l.shop as any;
        const profile = profileMap.get(shop._id.toString());

        let distance = 0;

        if (
          currentUser?.profile?.location &&
          profile?.location
        ) {
          distance = calculateDistance(
            currentUser.profile.location.latitude,
            currentUser.profile.location.longitude,
            profile.location.latitude,
            profile.location.longitude,
          );
        }

        return {
          _id: shop._id,
          name: shop.name,
          avatar: shop.avatar,
          email: shop.email,

          description: profile?.description,
          isOpen: profile?.isOpen,

          distance,
          isLike: true,
        };
      });

    return {
      meta: {
        current: page,
        pageSize,
        pages: totalPages,
        total: totalItems,
      },
      result: shops,
    };
  }

}
