import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Order } from 'src/orders/schemas/order.schema';
import { Product } from 'src/products/schemas/product.schema';
import { Review } from 'src/reviews/schemas/review.schema';
import { Like } from 'src/likes/schemas/like.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(Like.name) private likeModel: Model<Like>,
  ) { }

  // ======================
  // 📊 DASHBOARD ADMIN
  // ======================
  async getAdminDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [totalSellers, totalCustomers, totalSuccessOrders] = await Promise.all([
      this.userModel.countDocuments({ role: 'seller', isDeleted: { $ne: true } }),
      this.userModel.countDocuments({ role: 'customer', isDeleted: { $ne: true } }),
      this.orderModel.countDocuments({ orderStatus: 'completed', isDeleted: { $ne: true } }),
    ]);

    const revenueMonthAgg = await this.orderModel.aggregate([
      {
        $match: {
          orderStatus: 'completed',
          createdAt: { $gte: startOfMonth, $lte: now },
          isDeleted: { $ne: true },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const revenueMonth = revenueMonthAgg[0]?.total || 0;

    const revenueByMonthAgg = await this.orderModel.aggregate([
      {
        $match: {
          orderStatus: 'completed',
          createdAt: { $gte: startOfYear, $lte: now },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    const revenueByMonth = Array.from({ length: 12 }, (_, i) => {
      const data = revenueByMonthAgg.find((r) => r._id === i + 1);
      return {
        month: new Date(0, i).toLocaleString('en', { month: 'short' }),
        revenue: data ? data.revenue : 0,
      };
    });

    const usersByMonthAgg = await this.userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfYear, $lte: now },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' }, role: '$role' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const userRegisterByMonth = Array.from({ length: 12 }, (_, i) => {
      const customer = usersByMonthAgg.find(
        (u) => u._id.month === i + 1 && u._id.role === 'customer',
      );
      const seller = usersByMonthAgg.find(
        (u) => u._id.month === i + 1 && u._id.role === 'seller',
      );
      return {
        month: new Date(0, i).toLocaleString('en', { month: 'short' }),
        customers: customer ? customer.count : 0,
        sellers: seller ? seller.count : 0,
      };
    });

    return {
      totalSellers,
      totalCustomers,
      totalSuccessOrders,
      revenueMonth,
      revenueByMonth,
      userRegisterByMonth,
    };
  }

  // ======================
  // 📊 DASHBOARD SELLER
  // ======================
  async getSellerDashboard(sellerId: string) {
    const sellerObj = new Types.ObjectId(sellerId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);

    // ---- Thống kê cơ bản ----
    const [totalProducts, totalApprovedOrders, totalPendingOrders] = await Promise.all([
      this.productModel.countDocuments({ seller: sellerObj, isDeleted: { $ne: true } }),
      this.orderModel.countDocuments({
        shop: sellerObj,
        orderStatus: { $in: ['confirmed', 'preparing', 'delivering', 'completed'] },
        isDeleted: { $ne: true },
      }),
      this.orderModel.countDocuments({
        shop: sellerObj,
        orderStatus: 'pending',
        isDeleted: { $ne: true },
      }),
    ]);

    // ---- Doanh thu tháng ----
    const revenueMonthAgg = await this.orderModel.aggregate([
      {
        $match: {
          shop: sellerObj,
          orderStatus: 'completed',
          createdAt: { $gte: startOfMonth, $lte: now },
          isDeleted: { $ne: true },
        },
      },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const revenueThisMonth = revenueMonthAgg[0]?.total || 0;

    // ---- Biểu đồ doanh thu 7 ngày ----
    const revenue7DaysAgg = await this.orderModel.aggregate([
      {
        $match: {
          shop: sellerObj,
          orderStatus: 'completed',
          createdAt: { $gte: sevenDaysAgo, $lte: now },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          total: { $sum: '$totalPrice' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    const revenueData = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(sevenDaysAgo);
      day.setDate(sevenDaysAgo.getDate() + i);
      const found = revenue7DaysAgg.find((r) => r._id === day.getDate());
      return { day: (i + 1).toString(), revenue: found ? found.total : 0 };
    });

    // ---- Biểu đồ đơn hàng 7 ngày ----
    const orders7DaysAgg = await this.orderModel.aggregate([
      {
        $match: {
          shop: sellerObj,
          createdAt: { $gte: sevenDaysAgo, $lte: now },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    const ordersData = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(sevenDaysAgo);
      day.setDate(sevenDaysAgo.getDate() + i);
      const found = orders7DaysAgg.find((r) => r._id === day.getDate());
      return { day: (i + 1).toString(), orders: found ? found.count : 0 };
    });

    // ---- Trung bình rating ----
    const productIds = await this.productModel
      .find({ seller: sellerObj, isDeleted: { $ne: true } })
      .distinct('_id');

    let avgRating = 0;
    if (productIds.length > 0) {
      const ratingAgg = await this.reviewModel.aggregate([
        {
          $match: {
            product: { $in: productIds },
            isDeleted: { $ne: true },
          },
        },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]);
      avgRating = ratingAgg[0]?.avg ? Number(ratingAgg[0].avg.toFixed(1)) : 0;
    }

    // ---- Tổng số lượt thích ----
    const favorites = await this.likeModel.countDocuments({
      shop: sellerObj,
      isDeleted: { $ne: true },
    });

    return {
      totalProducts,
      totalApprovedOrders,
      totalPendingOrders,
      revenueThisMonth,
      revenueData,
      ordersData,
      avgRating,
      favorites,
    };
  }
}
