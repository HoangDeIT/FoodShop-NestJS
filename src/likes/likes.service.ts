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


@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private readonly likeModel: SoftDeleteModel<LikeDocument>,
    private readonly userService: UsersService,
  ) { }

  // 🟢 Thích shop
  async likeShop(userId: string, shopId: string) {
    if (userId === shopId)
      throw new BadRequestException('Bạn không thể tự like chính mình.');

    const shop = await this.userService.findOne(shopId);
    if (!shop || shop.role !== UserRole.SELLER)
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

    return !!existing;
  }

  // 📋 Lấy danh sách các shop mà user đã like
  async getLikedShopsByUser(userId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const likes = await this.likeModel
      .find({ user: userObjectId })
      .populate('shop', 'name email avatar isOpen status role')
      .lean();

    return likes
      .filter(l => l.shop && (l.shop as unknown as User).role === 'seller')
      .map(l => l.shop);
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

    // ✅ Gọi findOne() vì đã populate('location') sẵn
    const currentUser = await this.userService.findOne(userId);

    const query = this.likeModel
      .find(baseFilter)
      .populate({
        path: 'shop',
        select: 'name email avatar isOpen status role location',
        populate: {
          path: 'location',
          select: 'latitude longitude',
        },
      })
      .skip(offset)
      .limit(pageSize)
      .sort(sort as any)
      .lean();

    if (population) {
      query.populate(population as any);
    }

    const result = await query.exec();

    // 🧮 Tính isLike + distance
    const shops = result
      .filter(l => l.shop && (l.shop as any).role === 'seller')
      .map(l => {
        const shop = l.shop as any;

        let distance;
        if (
          currentUser?.location?.latitude &&
          currentUser?.location?.longitude &&
          shop?.location?.latitude &&
          shop?.location?.longitude
        ) {
          distance = calculateDistance(
            currentUser.location.latitude,
            currentUser.location.longitude,
            shop.location.latitude,
            shop.location.longitude,
          );
        } else {
          distance = 0;
        }

        return {
          ...shop,
          isLike: true,
          distance,
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
