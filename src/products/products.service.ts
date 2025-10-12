import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import aqp from 'api-query-params';
import { isValidObjectId, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { IUser } from 'src/users/users.interface';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private productModel: SoftDeleteModel<ProductDocument>,
  ) { }

  async create(dto: CreateProductDto, actor?: IUser) {
    const createdBy = actor && actor._id ? { _id: actor._id as unknown as Types.ObjectId, email: actor.email } : undefined;
    const seller = createdBy;
    const product = await this.productModel.create({ ...dto, createdBy, seller });
    return product;
  }

  async findAll(currentPage = 1, limit = 10, qs?: string) {
    const { filter, sort, population } = aqp(qs || '');
    delete (filter as any).current;
    delete (filter as any).pageSize;
    delete (filter as any).population;
    const page = Math.max(1, +currentPage || 1);
    const pageSize = Math.max(1, +limit || 10);
    const offset = (page - 1) * pageSize;

    const totalItems = await this.productModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = this.productModel
      .find(filter)
      .skip(offset)
      .limit(pageSize)
      .sort(sort as any);

    if (population) query.populate(population as any);

    const result = await query.exec();

    return {
      meta: { current: page, pageSize, pages: totalPages, total: totalItems },
      result,
    };
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('Product không hợp lệ');
    const found = await this.productModel.findById(id);
    if (!found) throw new BadRequestException('Không tìm thấy product');
    return found;
  }

  async update(id: string, dto: UpdateProductDto, actor?: IUser) {
    if (!isValidObjectId(id)) throw new BadRequestException('Product không hợp lệ');

    const updatedBy = actor && actor._id ? { _id: actor._id as unknown as Types.ObjectId, email: actor.email } : undefined;

    const res = await this.productModel.findByIdAndUpdate(
      id,
      { ...dto, updatedBy },
      { new: true },
    );

    if (!res) throw new BadRequestException('Không tìm thấy product để cập nhật');
    return res;
  }

  async remove(id: string, actor: IUser) {
    if (!isValidObjectId(id)) throw new BadRequestException('Product không hợp lệ');

    const found = await this.productModel.findById(id);
    if (!found) throw new BadRequestException('Không tìm thấy product để xoá');

    const deletedBy = { _id: actor._id as unknown as Types.ObjectId, email: actor.email };
    await this.productModel.updateOne({ _id: id }, { deletedBy });

    return this.productModel.softDelete({ _id: id });
  }
  async findSellerCategories(sellerId: string) {
    const categories = await this.productModel.aggregate([
      { $match: { seller: new Types.ObjectId(sellerId), isDeleted: false } },
      {
        $group: {
          _id: "$category",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: "$category._id",
          name: "$category.name",
          description: "$category.description",
          image: "$category.image",
          icon: "$category.icon",
        },
      },
    ]);

    return categories;
  }
  async toggleActive(id: string, inStock: boolean, actor: IUser) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    product.inStock = inStock;
    product.updatedAt = new Date();

    await product.save();

    return {
      message: `Product has been ${inStock ? 'activated' : 'deactivated'}`,
      data: product,
    };
  }

}
