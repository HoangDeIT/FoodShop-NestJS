import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { OrdersService } from 'src/orders/orders.service';
import aqp from 'api-query-params';
import { Product, ProductDocument } from 'src/products/schemas/product.schema';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: SoftDeleteModel<ReviewDocument>,
    private readonly orderService: OrdersService,
    @InjectModel(Product.name) private readonly productModel: SoftDeleteModel<ProductDocument>,
  ) { }

  /**
    * 🟢 Tạo review mới cho sản phẩm
    * - Không cần orderId
    * - Kiểm tra user có mua sản phẩm chưa
    * - So sánh số lần mua và số lần đã review
    * - Nếu còn slot thì cho phép review
    */
  async createReview(
    userId: string,
    dto: { product: string; rating: number; comment: string; images?: string[] },
  ) {
    const { product, rating, comment, images = [] } = dto;

    const userObjectId = new Types.ObjectId(userId);
    const productObjectId = new Types.ObjectId(product);

    // 1️⃣ Đếm số lần user đã mua sản phẩm này (completed orders)
    const totalPurchased = await this.orderService.countPurchasedProductByUser(
      userId,
      product,
    );

    if (totalPurchased <= 0)
      throw new BadRequestException(
        'Bạn chưa mua sản phẩm này hoặc đơn hàng chưa hoàn tất.',
      );

    // 2️⃣ Đếm số review user đã viết cho sản phẩm này
    const totalReviewed = await this.reviewModel.countDocuments({
      user: userObjectId,
      product: productObjectId,
      isDeleted: false,
    });

    // 3️⃣ Nếu đã review đủ số lần mua → chặn
    if (totalReviewed >= totalPurchased)
      throw new BadRequestException(
        'Bạn đã đánh giá đủ số lần cho sản phẩm này.',
      );

    // 4️⃣ Tạo review mới
    const review = await this.reviewModel.create({
      user: userObjectId,
      product: productObjectId,
      rating,
      comment,
      images,
    });

    return review;
  }
  /**
   * 🟡 Thêm phản hồi (reply) vào 1 review
   */
  async addReply(reviewId: string, userId: string, comment: string) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Không tìm thấy review.');

    review.replies.push({
      user: new Types.ObjectId(userId),
      comment,
      createdAt: new Date(),
    } as any);

    await review.save();
    return review;
  }

  /**
   * 🔵 Lấy danh sách review theo product
   */
  async getReviewsByProduct(productId: string) {
    return this.reviewModel
      .find({ product: productId, isDeleted: false })
      .populate('user', 'name avatar')
      .populate('replies.user', 'name avatar')
      .sort({ createdAt: -1 });
  }

  /**
   * 🔴 Xoá mềm review
   */
  async softDeleteReview(reviewId: string, userId: string) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Không tìm thấy review.');

    if (review.user.toString() !== userId) throw new ForbiddenException('Bạn không thể xoá review của người khác.');
    await review.deleteOne();
    return { message: 'Đã xoá review thành công.' };
  }
  async softDeleteReply(reviewId: string, replyId: string, userId: string) {
    const review = await this.reviewModel.findById(reviewId);
    if (!review) throw new NotFoundException('Không tìm thấy review.');
    console.log(replyId)
    //@ts-ignore
    const reply = review.replies.id(replyId);
    if (!reply) throw new NotFoundException('Không tìm thấy phản hồi.');

    if (reply.user.toString() !== userId) {
      throw new ForbiddenException('Bạn không thể xoá phản hồi của người khác.');
    }

    // Xóa khỏi mảng replies
    //@ts-ignore
    review.replies = review.replies.filter((r) => r._id.toString() !== replyId);
    await review.save();

    return { message: 'Đã xoá phản hồi thành công.' };
  }

  async checkCanReview(userId: string, productId: string) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    // 1️⃣ Đếm số lần user đã mua sản phẩm đó (đơn hàng completed)


    const totalPurchased = await this.orderService.countPurchasedProductByUser(userId, productId);
    // 2️⃣ Đếm số review user đã viết cho sản phẩm đó
    const totalReviewed = await this.reviewModel.countDocuments({
      user: userObjectId,
      product: productObjectId,
      isDeleted: false,
    });

    // 3️⃣ Cho phép nếu số mua > số review
    const canComment = totalPurchased > totalReviewed;

    return {
      canComment,
      totalPurchased,
      totalReviewed,
      remaining: Math.max(0, totalPurchased - totalReviewed),
    };
  }
  async calculateSellerAverageRating(sellerId: string) {
    if (!Types.ObjectId.isValid(sellerId)) {
      throw new NotFoundException('SellerId không hợp lệ.');
    }

    const [data] = await this.reviewModel.aggregate([
      {
        $match: {
          seller: new Types.ObjectId(sellerId),
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: '$seller',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    // Nếu chưa có review nào
    if (!data) {
      return 0;
    }
    return Math.round(data.averageRating * 10) / 10// làm tròn 1 số thập phân

  }
  async getReviewsForSellerGrouped(
    sellerId: string,
    currentPage = 1,
    limit = 10,
    qs: string,
  ) {
    const { filter, sort } = aqp(qs || '');
    delete filter.current;
    delete filter.pageSize;
    delete filter.status;

    const page = Math.max(1, +currentPage || 1);
    const pageSize = Math.max(1, +limit || 10);
    const offset = (page - 1) * pageSize;

    const sellerObjectId = new Types.ObjectId(sellerId);

    // 🔹 Lấy danh sách product của seller
    const products = await this.productModel.find(
      { seller: sellerObjectId, isDeleted: false },
      { _id: 1 },
    );
    if (!products.length) throw new NotFoundException('Bạn chưa có sản phẩm nào.');
    const productIds = products.map((p) => p._id);

    // 🔹 Lọc theo trạng thái
    const qsObj = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
    const status = qsObj['status'] || 'all';

    const match: any = {
      product: { $in: productIds },
      isDeleted: false,
    };

    if (status === 'replied') {
      match.replies = { $elemMatch: { user: sellerObjectId, isDeleted: { $ne: true } } };
    } else if (status === 'unreplied') {
      match.replies = { $not: { $elemMatch: { user: sellerObjectId, isDeleted: { $ne: true } } } };
    }

    // 🔹 Pipeline aggregation
    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
      // Populate user (người viết review)
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      // Populate replies.user
      {
        $lookup: {
          from: 'users',
          localField: 'replies.user',
          foreignField: '_id',
          as: 'replyUsers',
        },
      },
      // Map replies.user thành object user đầy đủ
      {
        $addFields: {
          replies: {
            $map: {
              input: '$replies',
              as: 'rep',
              in: {
                _id: '$$rep._id',
                comment: '$$rep.comment',
                createdAt: '$$rep.createdAt',
                isDeleted: '$$rep.isDeleted',
                user: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$replyUsers',
                        as: 'ru',
                        cond: { $eq: ['$$ru._id', '$$rep.user'] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      { $project: { replyUsers: 0, 'user.password': 0 } },
      // Lookup product info
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product._id',
          product: { $first: '$product' },
          reviews: {
            $push: {
              _id: '$_id',
              user: '$user',
              rating: '$rating',
              comment: '$comment',
              images: '$images',
              replies: '$replies',
              createdAt: '$createdAt',
            },
          },
          totalReviews: { $sum: 1 },
          avgRating: { $avg: '$rating' },
        },
      },
      { $sort: { 'product.name': 1 } },
      { $skip: offset },
      { $limit: pageSize },
    ];

    const result = await this.reviewModel.aggregate(pipeline);

    // Tổng số sản phẩm có review
    const totalProducts = await this.reviewModel.distinct('product', match);
    const totalPages = Math.ceil(totalProducts.length / pageSize);

    return {
      meta: {
        current: page,
        pageSize,
        pages: totalPages,
        total: totalProducts.length,
      },
      result,
    };
  }

  // async getReviewsForSellerGrouped(
  //   sellerId: string,
  //   currentPage = 1,
  //   limit = 10,
  //   qs: string,
  // ) {
  //   const { filter, sort } = aqp(qs || '');
  //   delete filter.current;
  //   delete filter.pageSize;

  //   const page = Math.max(1, +currentPage || 1);
  //   const pageSize = Math.max(1, +limit || 10);
  //   const offset = (page - 1) * pageSize;

  //   const sellerObjectId = new Types.ObjectId(sellerId);

  //   // 1️⃣ Lấy sản phẩm thuộc seller
  //   const products = await this.productModel.find(
  //     { seller: sellerObjectId, isDeleted: false },
  //     { _id: 1 },
  //   );
  //   if (!products.length) throw new NotFoundException('Bạn chưa có sản phẩm nào.');
  //   const productIds = products.map((p) => p._id);

  //   // 2️⃣ Trạng thái replied / unreplied
  //   const qsObj = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
  //   const status = qsObj['status'] || 'all';

  //   const match: any = {
  //     product: { $in: productIds },
  //     isDeleted: false,
  //   };

  //   if (status === 'replied') {
  //     match.replies = { $elemMatch: { user: sellerObjectId, isDeleted: { $ne: true } } };
  //   } else if (status === 'unreplied') {
  //     match.replies = { $not: { $elemMatch: { user: sellerObjectId, isDeleted: { $ne: true } } } };
  //   }

  //   // 3️⃣ Pipeline aggregation
  //   const pipeline: mongoose.PipelineStage[] = [
  //     { $match: match },
  //     {
  //       $lookup: {
  //         from: 'products',
  //         localField: 'product',
  //         foreignField: '_id',
  //         as: 'product',
  //       },
  //     },
  //     { $unwind: '$product' },
  //     {
  //       $group: {
  //         _id: '$product._id',
  //         product: { $first: '$product' },
  //         reviews: { $push: '$$ROOT' },
  //         totalReviews: { $sum: 1 },
  //         avgRating: { $avg: '$rating' },
  //       },
  //     },
  //     { $sort: { 'product.name': 1 } },
  //     { $skip: offset },
  //     { $limit: pageSize },
  //   ];

  //   const result = await this.reviewModel.aggregate(pipeline);

  //   // 4️⃣ Tính tổng số group (distinct product)
  //   const totalProducts = await this.reviewModel.distinct('product', match);
  //   const totalPages = Math.ceil(totalProducts.length / pageSize);

  //   return {
  //     meta: {
  //       current: page,
  //       pageSize,
  //       pages: totalPages,
  //       total: totalProducts.length,
  //     },
  //     result,
  //   };
  // }

  // async getReviewsForSeller(
  //   sellerId: string,
  //   currentPage = 1,
  //   limit = 10,
  //   qs: string,
  // ) {
  //   const { filter, sort, population } = aqp(qs || '');
  //   delete filter.current;
  //   delete filter.pageSize;


  //   const page = Math.max(1, +currentPage || 1);
  //   const pageSize = Math.max(1, +limit || 10);
  //   const offset = (page - 1) * pageSize;

  //   const sellerObjectId = new Types.ObjectId(sellerId);

  //   // 1️⃣ Lấy tất cả sản phẩm thuộc seller
  //   const products = await this.productModel.find(
  //     { seller: sellerObjectId, isDeleted: false },
  //     { _id: 1 },
  //   );
  //   if (!products.length) throw new NotFoundException('Bạn chưa có sản phẩm nào.');
  //   const productIds = products.map((p) => p._id);
  //   // 3️⃣ Xử lý filter theo status
  //   // query param: ?status=all | replied | unreplied
  //   const qsObj = typeof qs === 'string' ? new URLSearchParams(qs) : qs;
  //   const status = qsObj['status'] || 'all';
  //   delete filter.status; // ta xử lý riêng
  //   // 2️⃣ Base filter cho tất cả review của seller
  //   const baseFilter: any = {
  //     product: { $in: productIds },
  //     isDeleted: false,
  //     ...filter,
  //   };
  //   if (status === 'replied') {
  //     baseFilter.replies = {
  //       $elemMatch: { user: sellerObjectId, isDeleted: { $ne: true } },
  //     };
  //   }
  //   // unreplied: KHÔNG có reply của seller (tức là không tồn tại phần tử replies thỏa điều kiện)
  //   else if (status === 'unreplied') {
  //     baseFilter.replies = {
  //       $not: { $elemMatch: { user: sellerObjectId, isDeleted: { $ne: true } } },
  //     };
  //   }
  //   // 4️⃣ Đếm tổng số
  //   const totalItems = await this.reviewModel.countDocuments(baseFilter);
  //   const totalPages = Math.ceil(totalItems / pageSize);
  //   console.log(filter)
  //   // 5️⃣ Query dữ liệu
  //   const query = this.reviewModel
  //     .find(baseFilter)
  //     .skip(offset)
  //     .limit(pageSize)
  //     .sort((sort as any) || { createdAt: -1 })
  //     .populate('user', 'name avatar')
  //     .populate('product', 'name image')
  //     .populate('replies.user', 'name avatar');

  //   if (population) query.populate(population as any);

  //   const result = await query.exec();

  //   return {
  //     meta: {
  //       current: page,
  //       pageSize,
  //       pages: totalPages,
  //       total: totalItems,
  //     },
  //     result,
  //   };
  // }
}
