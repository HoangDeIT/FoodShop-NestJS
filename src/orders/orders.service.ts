import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import mongoose, { Types } from 'mongoose';
import { ProductsService } from 'src/products/products.service';
import { CartItemDto, CreateOrderDto } from './dto/create-order.dto';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { LocationsService } from 'src/locations/locations.service';
import { Product } from 'src/products/schemas/product.schema';
import { UsersService } from 'src/users/users.service';
import aqp from 'api-query-params';
import { calculateDistance } from 'src/utils/distance';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ExpoNotifyService } from 'src/notifications/expo-notify.service';
import { CustomerProfile, CustomerProfileDocument } from 'src/customer-profiles/schemas/customer-profile.schema';

interface ValidatedOrderItem {
  product: Types.ObjectId;
  productName: string;
  basePrice: number;
  sizeId?: Types.ObjectId;
  sizeName: string;
  toppingIds: Types.ObjectId[];
  toppingNames: string[];
  quantity: number;
  totalPrice: number;
  image?: string;
}

@Injectable()
export class OrdersService {
  private readonly SHIPPING_RATE = 4000; // đ/km

  constructor(
    private readonly locationService: LocationsService,
    private readonly productsService: ProductsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly expoNotifyService: ExpoNotifyService,
    @InjectModel(Order.name) private orderModel: SoftDeleteModel<OrderDocument>,
    @InjectModel(CustomerProfile.name) private customerProfileModel: SoftDeleteModel<CustomerProfileDocument>,
  ) { }

  async create(dto: CreateOrderDto, customerId: string) {
    const { shopId, items, location } = dto;

    if (!items?.length) throw new BadRequestException('Không có sản phẩm nào trong đơn hàng.');

    // 🧾 Lấy sản phẩm thật từ DB
    const products = await Promise.all(
      items.map((i) => this.productsService.findOne(i.productId)),
    );
    const result = await this.usersService.findOne({ id: shopId });
    if (!result) {
      throw new NotFoundException('User not found');
    }
    const { profile, user } = result;
    // ✅ Kiểm tra cùng shop
    const shopSet = new Set(products.map((p) => p.seller.toString()));
    if (
      shopSet.size > 1
      //  || !shopSet.has(shopId)
    ) {
      console.log('shopSet', !shopSet.has(shopId));
      throw new BadRequestException('Các sản phẩm không cùng một cửa hàng.');
    }

    // ✅ Tính giá dựa trên dữ liệu thật
    const { validatedItems, totalPrice } = this.calculateOrderItems(
      items,
      products,
    );

    // ✅ Tạo location người nhận
    let locationId: Types.ObjectId | undefined;
    let deliveryLoc: any = null;
    if (location?.latitude && location?.longitude) {
      const locationCreated = await this.locationService.create({
        ...location,
      });
      locationId = locationCreated._id;
      deliveryLoc = locationCreated;
    }

    // ✅ Lấy vị trí shop (giả lập: dùng 1 điểm cố định, hoặc query từ seller nếu có)
    // const shopLocation = await this.locationService.findById(shop?.location?.toString() || '');
    const shopLocation = profile?.location;
    if (!shopLocation) {
      throw new BadRequestException('Không tìm thấy vị trí cửa hàng.');
    }

    // ✅ Tính khoảng cách (km)
    const distance = calculateDistance(
      shopLocation.latitude,
      shopLocation.longitude,
      deliveryLoc.latitude,
      deliveryLoc.longitude,
    );
    if (distance > 10) {
      throw new BadRequestException(
        'Khoảng cách giao hàng vượt quá 10km, vui lòng chọn cửa hàng gần hơn.',
      );
    }
    // ✅ Tính phí ship
    const shippingCost = Math.round(distance * this.SHIPPING_RATE);

    // ✅ Tạo đơn hàng
    const order = await this.orderModel.create({
      customer: new Types.ObjectId(customerId),
      shop: new Types.ObjectId(shopId),
      items: validatedItems,
      totalPrice: totalPrice + shippingCost,
      orderStatus: 'pending',
      deliveryAddress: locationId,
      receiverName: dto.receiverName || '',
      receiverPhone: dto.receiverPhone || '',
      note: dto.note || '',
      distance,
      shippingCost,
    });
    // 🟢 Gửi realtime notification cho seller
    this.notificationsService.notifySeller(shopId, {
      type: 'NEW_ORDER',
      order: {
        id: order._id,
        totalPrice: order.totalPrice,
        distance: order.distance,
        shippingCost: order.shippingCost,
        receiverName: order.receiverName,
        note: order.note,
      },
    });
    return order;
  }

  private calculateOrderItems(
    items: CartItemDto[],
    products: (Product & { _id: Types.ObjectId })[],
  ) {
    const validatedItems: ValidatedOrderItem[] = [];
    let totalPrice = 0;

    for (const cartItem of items) {
      const product = products.find(
        (p) => p._id.toString() === cartItem.productId,
      );
      if (!product) throw new BadRequestException('Sản phẩm không tồn tại');

      const basePrice = product.basePrice ?? 0;
      let sizePrice = 0;
      let sizeName = '';
      let toppingPrice = 0;
      const toppingNames: string[] = [];

      if (cartItem.sizeId && product.sizes?.length) {
        const size = product.sizes.find((s: any) => s._id.toString() === cartItem.sizeId);
        if (size) {
          sizePrice = size.price || 0;
          sizeName = size.name || '';
        }
      }

      if (cartItem.toppingIds?.length && product.toppings?.length) {
        for (const tid of cartItem.toppingIds) {
          const topping = product.toppings.find((t: any) => t._id.toString() === tid);
          if (topping) {
            toppingPrice += topping.price || 0;
            toppingNames.push(topping.name);
          }
        }
      }

      const itemTotal = (basePrice + sizePrice + toppingPrice) * cartItem.quantity;
      totalPrice += itemTotal;

      validatedItems.push({
        product: product._id ?? new Types.ObjectId(cartItem.productId),
        productName: product.name,
        basePrice,
        sizeId: cartItem.sizeId ? new Types.ObjectId(cartItem.sizeId) : undefined,
        sizeName,
        toppingIds: cartItem.toppingIds?.map((id) => new Types.ObjectId(id)) || [],
        toppingNames,
        quantity: cartItem.quantity,
        totalPrice: itemTotal,
        image: product.image,
      });
    }


    return { validatedItems, totalPrice };
  }

  /** 🌍 Tính khoảng cách giữa 2 điểm (theo km) */




  async findAll(current = 1, pageSize = 10, qs?: string) {
    const { filter, sort, population } = aqp(qs || '');
    delete filter.current;
    delete filter.pageSize;
    delete filter.population;
    // delete filter.customerId;
    // delete filter.shopId;
    // ép kiểu & kiểm tra
    const page = Math.max(1, +current || 1);
    const limit = Math.max(1, +pageSize || 10);
    const offset = (page - 1) * limit;

    // ✅ Filter mặc định: chưa xoá mềm
    const queryFilter: any = { isDeleted: false };

    // ✅ Filter theo status (nếu có)
    if (filter.status) {
      queryFilter.orderStatus = filter.status;
    }

    // ✅ Filter theo customerId / shopId
    if (filter.customerId && Types.ObjectId.isValid(filter.customerId)) {
      queryFilter.customer = new Types.ObjectId(filter.customerId);
    }
    if (filter.shopId && Types.ObjectId.isValid(filter.shopId)) {
      queryFilter.shop = new Types.ObjectId(filter.shopId);
    }

    // ✅ Đếm tổng số bản ghi
    const totalItems = await this.orderModel.countDocuments(queryFilter);
    const totalPages = Math.ceil(totalItems / limit);

    // ✅ Truy vấn chính
    const query = this.orderModel
      .find(queryFilter)
      .populate([
        { path: 'shop', select: 'name email' },
        { path: 'customer', select: 'name email' },
        { path: 'deliveryAddress' },
      ])
      .sort(sort as any)
      .skip(offset)
      .limit(limit);

    if (population) {
      query.populate(population as any);
    }

    const result = await query.exec();

    // ✅ Trả về kết quả
    return {
      meta: {
        current: page,
        pageSize: limit,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };
  }
  /** 🧭 Cập nhật trạng thái đơn hàng (seller side) */
  async updateStatus(orderId: string, newStatus: string, shopId: string) {
    const order = await this.orderModel.findById(orderId);
    const profile = await this.customerProfileModel.findOne({
      userId: new Types.ObjectId(order?.customer),
    });

    const pushToken = profile?.expoToken;
    if (!order) throw new BadRequestException('Đơn hàng không tồn tại.');

    if (order.shop.toString() !== shopId.toString()) {
      throw new BadRequestException('Bạn không có quyền thay đổi đơn hàng này.');
    }

    const currentStatus = order.orderStatus;

    const allowedTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['delivering', 'cancelled'],
      delivering: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    const nextStatuses = allowedTransitions[currentStatus] || [];
    if (!nextStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Không thể chuyển từ trạng thái "${currentStatus}" sang "${newStatus}".`
      );
    }

    // 🔥🔥🔥 LOGIC CẬP NHẬT SOLD CHÍNH XÁC THEO YÊU CẦU 🔥🔥🔥
    if (newStatus === 'completed' && currentStatus !== 'completed') {
      await this.productsService.increaseProductSold(order);
    }

    order.orderStatus = newStatus;
    await order.save();

    // gửi realtime cho customer
    const customerId = order.customer?._id?.toString();
    // //@ts-ignore
    // const pushToken = order.customer?.expoToken;
    if (customerId) {
      this.notificationsService.notifyCustomer(customerId, {
        type: 'ORDER_STATUS_UPDATE',
        orderId: order._id,
        status: newStatus,
        message: this.getStatusMessage(newStatus),
      });
      if (pushToken) {
        this.expoNotifyService.sendNotification(
          pushToken,
          'Cập nhật đơn hàng',
          `Đơn hàng #${order._id} đã chuyển sang trạng thái: ${newStatus} `,
          { orderId: order._id, status: newStatus }
        );
      }
    }

    return order;
  }

  async findOne(filter: any) {
    const order = await this.orderModel.findOne(filter);
    if (!order) throw new BadRequestException('Đơn hàng không tồn tại.');
    return order;
  }
  async countPurchasedProductByUser(userId: string, productId: string): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);
    const productObjectId = new Types.ObjectId(productId);

    const result = await this.orderModel.aggregate([
      {
        $match: {
          customer: userObjectId, // ✅ ObjectId
          orderStatus: 'completed',
          isDeleted: false,
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.product': productObjectId, // ✅ ObjectId
        },
      },
      {
        $count: 'totalPurchased',
      },
    ]);

    return result?.[0]?.totalPurchased || 0;
  }

  private getStatusMessage(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Đơn hàng của bạn đã được xác nhận 🧾';
      case 'preparing':
        return 'Đơn hàng đang được chuẩn bị 🍳';
      case 'delivering':
        return 'Đơn hàng đang được giao 🚚';
      case 'completed':
        return 'Đơn hàng đã giao thành công 🎉';
      case 'cancelled':
        return 'Đơn hàng của bạn đã bị huỷ ❌';
      default:
        return `Trạng thái đơn hàng: ${status}`;
    }
  }
}
