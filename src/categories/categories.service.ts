import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import aqp from 'api-query-params';
import { isValidObjectId, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { IUser } from 'src/users/users.interface';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: SoftDeleteModel<CategoryDocument>,
  ) { }

  async create(dto: CreateCategoryDto, actor?: IUser) {
    const createdBy =
      actor && actor._id
        ? { _id: actor._id as unknown as Types.ObjectId, email: actor.email }
        : undefined;

    const category = await this.categoryModel.create({
      ...dto,
      createdBy,
    });
    return category;
  }
  async findAllNoPaging() {
    const result = await this.categoryModel.find().exec();
    return result;
  }
  async findAll(currentPage = 1, limit = 10, qs?: string) {
    const { filter, sort, population } = aqp(qs || '');
    delete (filter as any).current;
    delete (filter as any).pageSize;

    const page = Math.max(1, +currentPage || 1);
    const pageSize = Math.max(1, +limit || 10);
    const offset = (page - 1) * pageSize;

    const totalItems = await this.categoryModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / pageSize);

    const query = this.categoryModel
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
    if (!isValidObjectId(id)) throw new BadRequestException('ID danh mục không hợp lệ');
    const found = await this.categoryModel.findById(id);
    if (!found) throw new BadRequestException('Không tìm thấy danh mục');
    return found;
  }

  async update(id: string, dto: UpdateCategoryDto, actor?: IUser) {
    if (!isValidObjectId(id)) throw new BadRequestException('ID danh mục không hợp lệ');

    const updatedBy =
      actor && actor._id
        ? { _id: actor._id as unknown as Types.ObjectId, email: actor.email }
        : undefined;

    const res = await this.categoryModel.findByIdAndUpdate(
      id,
      { ...dto, updatedBy },
      { new: true },
    );

    if (!res) throw new BadRequestException('Không tìm thấy danh mục để cập nhật');
    return res;
  }

  async remove(id: string, actor: IUser) {
    if (!isValidObjectId(id)) throw new BadRequestException('ID danh mục không hợp lệ');

    const found = await this.categoryModel.findById(id);
    if (!found) throw new BadRequestException('Không tìm thấy danh mục để xoá');

    const deletedBy = {
      _id: actor._id as unknown as Types.ObjectId,
      email: actor.email,
    };
    await this.categoryModel.updateOne({ _id: id }, { deletedBy });

    return this.categoryModel.softDelete({ _id: id });
  }
}
