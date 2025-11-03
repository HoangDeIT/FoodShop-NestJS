import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Location, LocationDocument } from './schemas/location.schema';
import mongoose, { Types } from 'mongoose';

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(Location.name) private readonly locationModel: SoftDeleteModel<LocationDocument>,
  ) { }

  async create(dto: CreateLocationDto) {
    const doc = await this.locationModel.create({
      ...dto,
      coordinates: [dto.longitude, dto.latitude],
    });
    return doc;
  }


  findAll() {
    return `This action returns all locations`;
  }

  async findById(id: string) {
    const loc = await this.locationModel.findById(id);
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  update(id: number, updateLocationDto: UpdateLocationDto) {
    return `This action updates a #${id} location`;
  }

  async remove(id: string) {
    const location = await this.locationModel.findByIdAndDelete(id);
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }
  async findSellersNearby(
    latitude: number,
    longitude: number,
    radiusInKm = 10,
    currentPage = 1,
    pageSize = 10,
    categoryId?: string,
  ) {
    const radiusInMeters = radiusInKm * 1000;
    const skip = (currentPage - 1) * pageSize;

    const pipeline: mongoose.PipelineStage[] = [
      // 1️⃣ Tìm các seller có location gần nhất
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance: radiusInMeters,
          spherical: true,
        },
      },

      // 2️⃣ Nối sang user
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'location',
          as: 'user',
        },
      },
      { $unwind: '$user' },

      // 3️⃣ Lọc user có role = seller, đang mở cửa và hoạt động
      {
        $match: {
          'user.role': 'seller',
          'user.isDeleted': { $ne: true },
          'user.isOpen': true,      // ✅ chỉ hiện seller đang mở cửa
          'user.status': 'active',  // ✅ chỉ hiện seller đang hoạt động
        },
      },

      // 4️⃣ Nếu có categoryId, lọc theo sản phẩm hợp lệ
      ...(categoryId && mongoose.Types.ObjectId.isValid(categoryId)
        ? [
          {
            $lookup: {
              from: 'products',
              localField: 'user._id',
              foreignField: 'seller',
              as: 'products',
            },
          },
          {
            $addFields: {
              products: {
                $filter: {
                  input: '$products',
                  as: 'prod',
                  cond: {
                    $and: [
                      { $eq: ['$$prod.category', new mongoose.Types.ObjectId(categoryId)] },
                      { $eq: ['$$prod.isDeleted', false] },
                      { $eq: ['$$prod.inStock', true] },
                    ],
                  },
                },
              },
            },
          },
          // Ẩn seller không có sản phẩm hợp lệ trong category
          { $match: { 'products.0': { $exists: true } } },
        ]
        : []),

      // 5️⃣ Sắp xếp và phân trang
      { $sort: { distance: 1 } },
      {
        $facet: {
          result: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                distance: { $divide: ['$distance', 1000] }, // km
                address: 1,
                'user._id': 1,
                'user.name': 1,
                'user.email': 1,
                'user.avatar': 1,
                'user.role': 1,
                'user.description': 1,
                'user.location': 1,
                'user.isOpen': 1,
                'user.status': 1,
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [data] = await this.locationModel.aggregate(pipeline);

    const totalItems = data?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      meta: {
        current: currentPage,
        pageSize,
        total: totalItems,
        pages: totalPages,
      },
      result: data.result,
    };
  }

  async findProductsNearby(
    keyword: string,
    latitude: number,
    longitude: number,
    radiusInKm = 10,
    currentPage = 1,
    pageSize = 15,
  ) {
    const radiusInMeters = radiusInKm * 1000;
    const skip = (currentPage - 1) * pageSize;

    const pipeline: mongoose.PipelineStage[] = [
      // 1️⃣ Tìm các vị trí gần nhất
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance: radiusInMeters,
          spherical: true,
        },
      },

      // 2️⃣ Liên kết sang user (seller)
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'location',
          as: 'user',
        },
      },
      { $unwind: '$user' },

      // 3️⃣ Lọc seller hợp lệ (mở cửa + active)
      {
        $match: {
          'user.role': 'seller',
          'user.isDeleted': { $ne: true },
          'user.isOpen': true,
          'user.status': 'active',
        },
      },

      // 4️⃣ Liên kết sang products của seller đó
      {
        $lookup: {
          from: 'products',
          localField: 'user._id',
          foreignField: 'seller',
          as: 'products',
        },
      },
      { $unwind: '$products' },

      // 5️⃣ Lọc theo keyword (tên hoặc mô tả)
      {
        $match: {
          $and: [
            {
              $or: [
                { 'products.name': { $regex: keyword, $options: 'i' } },
                { 'products.description': { $regex: keyword, $options: 'i' } },
              ],
            },
            { 'products.isDeleted': { $ne: true } },
            { 'products.inStock': true }, // ✅ chỉ lấy sản phẩm còn hàng
          ],
        },
      },

      // 6️⃣ Sắp xếp theo khoảng cách
      { $sort: { distance: 1 } },

      // 7️⃣ Phân trang
      {
        $facet: {
          result: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                distance: { $divide: ['$distance', 1000] }, // km
                address: 1,
                'user._id': 1,
                'user.name': 1,
                'user.avatar': 1,
                'user.email': 1,
                'user.description': 1,
                'user.isOpen': 1,
                'user.status': 1,
                'products._id': 1,
                'products.name': 1,
                'products.image': 1,
                'products.basePrice': 1,
                'products.category': 1,
                'products.sold': 1,
                'products.inStock': 1,
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [data] = await this.locationModel.aggregate(pipeline);

    const totalItems = data?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      meta: {
        current: currentPage,
        pageSize,
        total: totalItems,
        pages: totalPages,
      },
      result: data.result,
    };
  }

  async findSellersWithProductsNearby(
    latitude: number,
    longitude: number,
    radiusInKm = 10,
    currentPage = 1,
    pageSize = 10,
    categoryId?: string,
  ) {
    const radiusInMeters = radiusInKm * 1000;
    const skip = (currentPage - 1) * pageSize;

    const pipeline: mongoose.PipelineStage[] = [

      // 1️⃣ Tìm các seller có location gần nhất
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: radiusInMeters,
          spherical: true,
        },
      },

      // 2️⃣ Liên kết sang user (seller)
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "location",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // 3️⃣ Chỉ lấy seller hợp lệ (đang hoạt động và mở cửa)
      {
        $match: {
          "user.role": "seller",
          "user.isDeleted": { $ne: true },
          "user.isOpen": true,
          "user.status": "active",
        },
      },

      // 4️⃣ Lấy sản phẩm của từng seller
      {
        $lookup: {
          from: "products",
          localField: "user._id",
          foreignField: "seller",
          as: "products",
        },
      },

      // 🟩 5️⃣ Liên kết sang reviews để tính trung bình rating
      {
        $lookup: {
          from: "reviews",
          localField: "user._id",
          foreignField: "seller",
          as: "reviews",
        },
      },
      {
        $addFields: {
          averageRating: {
            $cond: [
              { $gt: [{ $size: "$reviews" }, 0] },
              { $round: [{ $avg: "$reviews.rating" }, 1] },
              5, // 🟩 Nếu chưa có review nào => mặc định 5 sao
            ],
          },
          totalReviews: { $size: "$reviews" },
        },
      },


      // (sau đó là phần lọc theo category như cũ)

      // 5️⃣ Lọc theo category (nếu có)
      ...(categoryId && mongoose.Types.ObjectId.isValid(categoryId)
        ? [
          {
            $addFields: {
              products: {
                $filter: {
                  input: "$products",
                  as: "prod",
                  cond: {
                    $and: [
                      { $eq: ["$$prod.category", new mongoose.Types.ObjectId(categoryId)] },
                      { $eq: ["$$prod.isDeleted", false] },
                      { $eq: ["$$prod.inStock", true] }, // ✅ chỉ lấy sản phẩm còn hàng
                    ],
                  },
                },
              },
            },
          },
        ]
        : [
          {
            $addFields: {
              products: {
                $filter: {
                  input: "$products",
                  as: "prod",
                  cond: {
                    $and: [
                      { $eq: ["$$prod.isDeleted", false] },
                      { $eq: ["$$prod.inStock", true] }, // ✅ chỉ lấy sản phẩm còn hàng
                    ],
                  },
                },
              },
            },
          },
        ]),

      // 6️⃣ Chỉ lấy seller có ít nhất 1 sản phẩm hợp lệ
      { $match: { "products.0": { $exists: true } } },

      // 7️⃣ Sắp xếp theo khoảng cách
      { $sort: { distance: 1 } },

      // 8️⃣ Phân trang
      {
        $facet: {
          result: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                distance: { $divide: ["$distance", 1000] }, // km
                address: 1,
                averageRating: 1,   // 🟩 Thêm dòng này
                totalReviews: 1,    // 🟩 Và dòng này
                seller: {
                  _id: "$user._id",
                  name: "$user.name",
                  avatar: "$user.avatar",
                  email: "$user.email",
                  description: "$user.description",
                  isOpen: "$user.isOpen",
                  status: "$user.status",
                },
                products: {
                  $map: {
                    input: "$products",
                    as: "p",
                    in: {
                      _id: "$$p._id",
                      name: "$$p.name",
                      image: "$$p.image",
                      basePrice: "$$p.basePrice",
                      sold: "$$p.sold",
                      inStock: "$$p.inStock",
                    },
                  },
                },
              },
            },

          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [data] = await this.locationModel.aggregate(pipeline);

    const totalItems = data?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      meta: {
        current: currentPage,
        pageSize,
        total: totalItems,
        pages: totalPages,
      },
      result: data.result,
    };
  }
  async findNearbySellerTypes(userId: string) {
    const limit = 8;
    const radiusInKm = 10;
    const radiusInMeters = radiusInKm * 1000;

    const user = await this.locationModel
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'location',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        { $match: { 'user._id': new mongoose.Types.ObjectId(userId) } },
        { $limit: 1 },
      ])
      .then((res) => res[0]);

    if (!user || !user.coordinates)
      throw new NotFoundException('Không tìm thấy vị trí người dùng.');

    const coordinates = user.coordinates;

    const baseGeoPipeline: mongoose.PipelineStage[] = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates },
          distanceField: 'distance',
          spherical: true,
          maxDistance: radiusInMeters,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'location',
          as: 'seller',
        },
      },
      { $unwind: '$seller' },
      {
        $match: {
          'seller.role': 'seller',
          'seller.isDeleted': { $ne: true },
          'seller.status': 'active',
        },
      },
    ];

    // 🔸 1. Seller bán chạy nhất
    const topSellingPipeline: mongoose.PipelineStage[] = [
      ...baseGeoPipeline,
      {
        $lookup: {
          from: 'products',
          localField: 'seller._id',
          foreignField: 'seller',
          as: 'products',
        },
      },
      {
        $addFields: {
          totalSold: { $sum: '$products.sold' },
        },
      },
      { $sort: { totalSold: -1, distance: 1 } },
      { $limit: limit },
      {
        $project: {
          distance: { $divide: ['$distance', 1000] },
          totalSold: 1,
          seller: {
            _id: 1,
            name: 1,
            avatar: 1,
            email: 1,
            description: 1,
          },
        },
      },
    ];

    const topSelling = await this.locationModel.aggregate(topSellingPipeline);

    // 🔸 2. Seller user đã thích
    const likedPipeline: mongoose.PipelineStage[] = [
      ...baseGeoPipeline,

      // 1️⃣ Liên kết likes để lấy những ai đã thích seller
      {
        $lookup: {
          from: 'likes',
          localField: 'seller._id',
          foreignField: 'shop',
          as: 'likes',
        },
      },

      // 2️⃣ Lọc chỉ giữ lại like của user hiện tại
      {
        $addFields: {
          likedByCurrentUser: {
            $filter: {
              input: '$likes',
              as: 'like',
              cond: {
                $and: [
                  { $eq: ['$$like.user', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$$like.isDeleted', false] },
                ],
              },
            },
          },
        },
      },

      // 3️⃣ Chỉ lấy seller có ít nhất 1 like của user này
      {
        $match: {
          'likedByCurrentUser.0': { $exists: true },
        },
      },

      // 4️⃣ Sắp xếp và giới hạn
      { $sort: { likeCount: -1, distance: 1 } },
      { $limit: limit },

      // 5️⃣ Trả về dữ liệu cần thiết
      {
        $project: {
          distance: { $divide: ['$distance', 1000] },
          seller: {
            _id: '$seller._id',
            name: '$seller.name',
            email: '$seller.email',
            avatar: '$seller.avatar',
            description: '$seller.description',
          },
          likeCount: { $size: '$likes' }, // tổng like toàn shop (nếu cần)
        },
      },
    ];

    const liked = await this.locationModel.aggregate(likedPipeline);
    // 🔸 3. Seller user từng order
    const orderedPipeline: mongoose.PipelineStage[] = [
      ...baseGeoPipeline,

      // 🔹 join sang orders
      {
        $lookup: {
          from: 'orders',
          localField: 'seller._id',
          foreignField: 'shop', // ✅ đúng field theo schema bạn gửi
          as: 'orders',
        },
      },

      // 🔹 lọc những đơn hàng của user hiện tại
      {
        $addFields: {
          userOrders: {
            $filter: {
              input: '$orders',
              as: 'order',
              cond: {
                $and: [
                  { $eq: ['$$order.customer', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$$order.isDeleted', false] },
                ],
              },
            },
          },
        },
      },

      // 🔹 chỉ lấy seller có ít nhất 1 đơn hàng của user này
      {
        $match: {
          'userOrders.0': { $exists: true },
        },
      },

      // 🔹 sắp xếp theo khoảng cách gần nhất
      { $sort: { totalOrders: -1, distance: 1 } },
      { $limit: limit },

      // 🔹 hiển thị dữ liệu cần
      {
        $project: {
          distance: { $divide: ['$distance', 1000] },
          totalOrders: { $size: '$userOrders' },
          seller: {
            _id: '$seller._id',
            name: '$seller.name',
            avatar: '$seller.avatar',
            email: '$seller.email',
            description: '$seller.description',
          },
        },
      },
    ];

    const ordered = await this.locationModel.aggregate(orderedPipeline);

    // 🔸 4. Seller có rating cao nhất
    const topRatedPipeline: mongoose.PipelineStage[] = [
      ...baseGeoPipeline,
      {
        $lookup: {
          from: 'products',
          localField: 'seller._id',
          foreignField: 'seller',
          as: 'products',
        },
      },
      // { $unwind: '$products' },
      {
        $lookup: {
          from: 'reviews',
          localField: 'products._id',
          foreignField: 'product',
          as: 'reviews',
        },
      },
      {
        $addFields: {
          avgRating: { $avg: '$reviews.rating' },
        },
      },
      { $sort: { avgRating: -1, distance: 1 } },
      { $limit: limit },
      {
        $project: {
          distance: { $divide: ['$distance', 1000] },
          avgRating: { $ifNull: ['$avgRating', 0] },
          seller: {
            _id: 1,
            name: 1,
            avatar: 1,
            email: 1,
            description: 1,
          },
        },
      },
    ];

    const topRated = await this.locationModel.aggregate(topRatedPipeline);

    return {
      topSelling,
      liked,
      ordered,
      topRated,
    };
  }


}
