import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Location, LocationDocument } from './schemas/location.schema';
import mongoose, { Types } from 'mongoose';
import { SellerProfile, SellerProfileDocument } from 'src/seller-profiles/schemas/seller-profile.schema';
import { CustomerProfile, CustomerProfileDocument } from 'src/customer-profiles/schemas/customer-profile.schema';

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(Location.name) private readonly locationModel: SoftDeleteModel<LocationDocument>,
    @InjectModel(CustomerProfile.name) private readonly customerProfileModel: SoftDeleteModel<CustomerProfileDocument>,
    @InjectModel(SellerProfile.name) private readonly sellerProfileModel: SoftDeleteModel<SellerProfileDocument>,
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

    // const pipeline: mongoose.PipelineStage[] = [
    //   // 1️⃣ Tìm các seller có location gần nhất
    //   {
    //     $geoNear: {
    //       near: { type: 'Point', coordinates: [longitude, latitude] },
    //       distanceField: 'distance',
    //       maxDistance: radiusInMeters,
    //       spherical: true,
    //     },
    //   },

    //   // 2️⃣ Nối sang user
    //   {
    //     $lookup: {
    //       from: 'users',
    //       localField: '_id',
    //       foreignField: 'location',
    //       as: 'user',
    //     },
    //   },
    //   { $unwind: '$user' },

    //   // 3️⃣ Lọc user có role = seller, đang mở cửa và hoạt động
    //   {
    //     $match: {
    //       'user.role': 'seller',
    //       'user.isDeleted': { $ne: true },
    //       'user.isOpen': true,      // ✅ chỉ hiện seller đang mở cửa
    //       'user.status': 'active',  // ✅ chỉ hiện seller đang hoạt động
    //     },
    //   },

    //   // 4️⃣ Nếu có categoryId, lọc theo sản phẩm hợp lệ
    //   ...(categoryId && mongoose.Types.ObjectId.isValid(categoryId)
    //     ? [
    //       {
    //         $lookup: {
    //           from: 'products',
    //           localField: 'user._id',
    //           foreignField: 'seller',
    //           as: 'products',
    //         },
    //       },
    //       {
    //         $addFields: {
    //           products: {
    //             $filter: {
    //               input: '$products',
    //               as: 'prod',
    //               cond: {
    //                 $and: [
    //                   { $eq: ['$$prod.category', new mongoose.Types.ObjectId(categoryId)] },
    //                   { $eq: ['$$prod.isDeleted', false] },
    //                   { $eq: ['$$prod.inStock', true] },
    //                 ],
    //               },
    //             },
    //           },
    //         },
    //       },
    //       // Ẩn seller không có sản phẩm hợp lệ trong category
    //       { $match: { 'products.0': { $exists: true } } },
    //     ]
    //     : []),

    //   // 5️⃣ Sắp xếp và phân trang
    //   { $sort: { distance: 1 } },
    //   {
    //     $facet: {
    //       result: [
    //         { $skip: skip },
    //         { $limit: pageSize },
    //         {
    //           $project: {
    //             _id: 0,
    //             distance: { $divide: ['$distance', 1000] }, // km
    //             address: 1,
    //             'user._id': 1,
    //             'user.name': 1,
    //             'user.email': 1,
    //             'user.avatar': 1,
    //             'user.role': 1,
    //             'user.description': 1,
    //             'user.location': 1,
    //             'user.isOpen': 1,
    //             'user.status': 1,
    //           },
    //         },
    //       ],
    //       totalCount: [{ $count: 'count' }],
    //     },
    //   },
    // ];
    const pipeline: mongoose.PipelineStage[] = [

      // 1️⃣ tìm location gần
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: radiusInMeters,
          spherical: true
        }
      },

      // 2️⃣ join seller profile
      {
        $lookup: {
          from: "sellerprofiles",
          localField: "_id",
          foreignField: "location",
          as: "seller"
        }
      },
      { $unwind: "$seller" },

      // 3️⃣ join user
      {
        $lookup: {
          from: "users",
          localField: "seller.userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      // 4️⃣ filter
      {
        $match: {
          "user.role": "seller",
          "user.isDeleted": { $ne: true },
          "user.status": "active",
          "seller.isOpen": true
        }
      },

      // 5️⃣ sort
      { $sort: { distance: 1 } },

      // 6️⃣ pagination
      {
        $facet: {
          result: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                distance: { $divide: ["$distance", 1000] },
                address: 1,

                "user._id": 1,
                "user.name": 1,
                "user.avatar": 1,

                "seller.shopName": 1,
                "seller.description": 1,
                "seller.isOpen": 1
              }
            }
          ],
          totalCount: [{ $count: "count" }]
        }
      }
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

      // 1️⃣ tìm location gần
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: radiusInMeters,
          spherical: true,
        },
      },

      // 2️⃣ join seller profile
      {
        $lookup: {
          from: "sellerprofiles",
          localField: "_id",
          foreignField: "location",
          as: "seller",
        },
      },
      { $unwind: "$seller" },

      // 3️⃣ join user
      {
        $lookup: {
          from: "users",
          localField: "seller.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // 4️⃣ lọc seller hợp lệ
      {
        $match: {
          "user.role": "seller",
          "user.isDeleted": { $ne: true },
          "user.status": "active",
          "seller.isOpen": true,
        },
      },

      // 5️⃣ join products
      {
        $lookup: {
          from: "products",
          localField: "user._id",
          foreignField: "seller",
          as: "products",
        },
      },
      { $unwind: "$products" },

      // 6️⃣ lọc product
      {
        $match: {
          $and: [
            {
              $or: [
                { "products.name": { $regex: keyword, $options: "i" } },
                { "products.description": { $regex: keyword, $options: "i" } },
              ],
            },
            { "products.isDeleted": { $ne: true } },
            { "products.inStock": true },
          ],
        },
      },

      // 7️⃣ sort
      { $sort: { distance: 1 } },

      // 8️⃣ pagination
      {
        $facet: {
          result: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                distance: { $divide: ["$distance", 1000] },

                address: "$address",

                "user._id": 1,
                "user.name": 1,
                "user.avatar": 1,

                "seller.shopName": 1,
                "seller.description": 1,

                "products._id": 1,
                "products.name": 1,
                "products.image": 1,
                "products.basePrice": 1,
                "products.category": 1,
                "products.sold": 1,
                "products.inStock": 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [data] = await this.locationModel
      .aggregate(pipeline)
      .collation({ locale: 'vi', strength: 1 }); // ✅ Bỏ phân biệt hoa/thường & dấu


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

      // 1️⃣ tìm location gần
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: radiusInMeters,
          spherical: true
        }
      },

      // 2️⃣ join seller profile
      {
        $lookup: {
          from: "sellerprofiles",
          localField: "_id",
          foreignField: "location",
          as: "seller"
        }
      },
      { $unwind: "$seller" },

      // 3️⃣ join user
      {
        $lookup: {
          from: "users",
          localField: "seller.userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },

      // 4️⃣ filter seller
      {
        $match: {
          "user.role": "seller",
          "user.isDeleted": { $ne: true },
          "user.status": "active",
          "seller.isOpen": true
        }
      },

      // 5️⃣ lấy products hợp lệ luôn trong lookup
      {
        $lookup: {
          from: "products",
          let: { sellerId: "$user._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$seller", "$$sellerId"] },
                    { $eq: ["$isDeleted", false] },
                    { $eq: ["$inStock", true] },
                    ...(categoryId
                      ? [{ $eq: ["$category", new mongoose.Types.ObjectId(categoryId)] }]
                      : [])
                  ]
                }
              }
            },
            {
              $project: {
                name: 1,
                image: 1,
                basePrice: 1,
                sold: 1,
                inStock: 1
              }
            }
          ],
          as: "products"
        }
      },

      // 6️⃣ chỉ giữ seller có product
      {
        $match: { "products.0": { $exists: true } }
      },

      // 7️⃣ rating theo seller
      {
        $lookup: {
          from: "reviews",
          let: { sellerProducts: "$products._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$product", "$$sellerProducts"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                avgRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 }
              }
            }
          ],
          as: "rating"
        }
      },

      {
        $addFields: {
          averageRating: {
            $ifNull: [{ $round: [{ $arrayElemAt: ["$rating.avgRating", 0] }, 1] }, 5]
          },
          totalReviews: {
            $ifNull: [{ $arrayElemAt: ["$rating.totalReviews", 0] }, 0]
          }
        }
      },

      { $sort: { distance: 1 } },

      {
        $facet: {
          result: [
            { $skip: skip },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                distance: { $divide: ["$distance", 1000] },
                address: 1,
                averageRating: 1,
                totalReviews: 1,

                seller: {
                  _id: "$user._id",
                  name: "$user.name",
                  avatar: "$user.avatar"
                },

                products: 1
              }
            }
          ],
          totalCount: [{ $count: "count" }]
        }
      }

    ];
    const [data] = await this.locationModel
      .aggregate(pipeline)
      .collation({ locale: 'vi', strength: 1 }); // ✅ Bỏ phân biệt hoa/thường & dấu


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

    // 1️⃣ lấy location của user
    const userProfile = await this.customerProfileModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate("location")
      .lean();

    if (!userProfile?.location?.coordinates)
      throw new NotFoundException("Không tìm thấy vị trí người dùng");

    const coordinates: [number, number] = [
      userProfile.location.coordinates[0],
      userProfile.location.coordinates[1]
    ];

    const pipeline: mongoose.PipelineStage[] = [

      // 🔹 tìm location gần
      {
        $geoNear: {
          near: { type: "Point", coordinates },
          distanceField: "distance",
          spherical: true,
          maxDistance: radiusInMeters
        }
      },

      // 🔹 join seller profile
      {
        $lookup: {
          from: "sellerprofiles",
          localField: "_id",
          foreignField: "location",
          as: "sellerProfile"
        }
      },
      { $unwind: "$sellerProfile" },

      // 🔹 join user
      {
        $lookup: {
          from: "users",
          localField: "sellerProfile.userId",
          foreignField: "_id",
          as: "seller"
        }
      },
      { $unwind: "$seller" },

      // 🔹 filter seller hợp lệ
      {
        $match: {
          "seller.role": "seller",
          "seller.isDeleted": { $ne: true },
          "seller.status": "active",
          "sellerProfile.isOpen": true
        }
      },

      // 🔹 join products
      {
        $lookup: {
          from: "products",
          let: { sellerId: "$seller._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$seller", "$$sellerId"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            },
            {
              $project: {
                sold: 1
              }
            }
          ],
          as: "products"
        }
      },

      // 🔹 join reviews
      {
        $lookup: {
          from: "reviews",
          let: { productIds: "$products._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$product", "$$productIds"] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                avgRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 }
              }
            }
          ],
          as: "rating"
        }
      },

      // 🔹 join likes
      {
        $lookup: {
          from: "likes",
          let: { shopId: "$seller._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$shop", "$$shopId"] },
                    { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "liked"
        }
      },

      // 🔹 join orders
      {
        $lookup: {
          from: "orders",
          let: { shopId: "$seller._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$shop", "$$shopId"] },
                    { $eq: ["$customer", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$isDeleted", false] }
                  ]
                }
              }
            }
          ],
          as: "orders"
        }
      },

      // 🔹 tính toán
      {
        $addFields: {
          totalSold: { $sum: "$products.sold" },

          avgRating: {
            $ifNull: [
              { $arrayElemAt: ["$rating.avgRating", 0] },
              0
            ]
          },

          totalReviews: {
            $ifNull: [
              { $arrayElemAt: ["$rating.totalReviews", 0] },
              0
            ]
          },

          likedByUser: { $gt: [{ $size: "$liked" }, 0] },

          totalOrders: { $size: "$orders" }
        }
      },

      // 🔹 tách thành 4 list
      {
        $facet: {

          topSelling: [
            { $sort: { totalSold: -1, distance: 1 } },
            { $limit: limit },
            {
              $project: {
                _id: "$seller._id",

                seller: {
                  _id: "$seller._id",
                  name: "$seller.name",
                  email: "$seller.email",
                  avatar: "$seller.avatar",
                  role: "$seller.role",
                  status: "$seller.status",

                  // 👇 lấy từ profile
                  isOpen: "$sellerProfile.isOpen"
                },

                totalSold: 1,

                // 🔥 convert sang km
                distance: { $divide: ["$distance", 1000] }
              }
            }
          ],

          liked: [
            { $match: { likedByUser: true } },
            { $sort: { distance: 1 } },
            { $limit: limit },
            {
              $project: {
                _id: "$seller._id",

                seller: {
                  _id: "$seller._id",
                  name: "$seller.name",
                  avatar: "$seller.avatar",
                  email: "$seller.email",
                  role: "$seller.role",
                  status: "$seller.status",
                  isOpen: "$sellerProfile.isOpen"
                },

                likeCount: { $size: "$liked" },

                distance: { $divide: ["$distance", 1000] }
              }
            }
          ],

          ordered: [
            { $match: { totalOrders: { $gt: 0 } } },
            { $sort: { totalOrders: -1, distance: 1 } },
            { $limit: limit },
            {
              $project: {
                _id: "$seller._id",

                seller: {
                  _id: "$seller._id",
                  name: "$seller.name",
                  avatar: "$seller.avatar",
                  email: "$seller.email",
                  role: "$seller.role",
                  status: "$seller.status",
                  isOpen: "$sellerProfile.isOpen"
                },

                totalOrders: 1,

                distance: { $divide: ["$distance", 1000] }
              }
            }
          ],

          topRated: [
            { $sort: { avgRating: -1, distance: 1 } },
            { $limit: limit },
            {
              $project: {
                _id: "$seller._id",

                seller: {
                  _id: "$seller._id",
                  name: "$seller.name",
                  avatar: "$seller.avatar",
                  email: "$seller.email",
                  role: "$seller.role",
                  status: "$seller.status",
                  isOpen: "$sellerProfile.isOpen"
                },

                avgRating: 1,

                distance: { $divide: ["$distance", 1000] }
              }
            }
          ]

        }
      }

    ];

    const [data] = await this.locationModel.aggregate(pipeline);

    return {
      topSelling: data?.topSelling || [],
      liked: data?.liked || [],
      ordered: data?.ordered || [],
      topRated: data?.topRated || []
    };
  }


}
