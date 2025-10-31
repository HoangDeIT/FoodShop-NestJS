import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { OrdersService } from 'src/orders/orders.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: SoftDeleteModel<ReviewDocument>,
    private readonly orderService: OrdersService
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

}
