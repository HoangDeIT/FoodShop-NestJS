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
      // 1️⃣ Tìm các location gần nhất
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

      // 3️⃣ Lọc user có role = seller và chưa xóa
      {
        $match: {
          'user.role': 'seller',
          'user.isDeleted': { $ne: true },
        },
      },

      // 4️⃣ Nếu có categoryId, lọc theo sản phẩm
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
            $match: {
              'products.category': new mongoose.Types.ObjectId(categoryId),
            },
          },
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

}
