import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose, { Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { ProductsService } from 'src/products/products.service';
import { log } from 'console';

@Injectable()
export class CartsService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: SoftDeleteModel<CartDocument>,


    private readonly productService: ProductsService,
  ) { }

  // 🛒 Lấy giỏ hàng của user (kể cả nếu đã soft delete thì tạo lại)
  async getCartByUser(userId: string) {
    let cart = await this.cartModel.findOne({ customer: userId });
    if (!cart) {
      await this.cartModel.create({
        customer: userId,
        shopCarts: [],
        grandTotal: 0,
      });
      // ✅ Lấy lại để hydrate đầy đủ schema
      cart = await this.cartModel.findOne({ customer: userId });
    }
    return cart!;
  }

  // ➕ Thêm sản phẩm vào giỏ
  async addToCart(userId: string, shopId: string, itemData: any): Promise<Cart> {
    const product = await this.productService.findOne(itemData.product);
    if (!product) throw new NotFoundException('Product not found');

    const cart = await this.getCartByUser(userId);

    let shopCart = cart.shopCarts.find(
      (sc) => sc.shop.toString() === shopId.toString(),
    );

    if (!shopCart) {
      shopCart = {
        shop: new mongoose.Types.ObjectId(shopId),
        items: [],
        totalPrice: 0,
      };
      cart.shopCarts.push(shopCart as any);
      shopCart = cart.shopCarts[cart.shopCarts.length - 1];
    }

    const existingItem = shopCart?.items.find(
      (i) =>
        i.product.toString() === itemData.product &&
        i.sizeId?.toString() === itemData.sizeId &&
        JSON.stringify(i.toppingIds || []) ===
        JSON.stringify(itemData.toppingIds || []),
    );

    if (existingItem) {
      existingItem.quantity += itemData.quantity;
      existingItem.totalPrice = existingItem.quantity * existingItem.basePrice;
    } else {
      const totalPrice = itemData.quantity * itemData.basePrice;
      shopCart?.items.push({
        ...itemData,
        totalPrice,
      });
      console.log('🛒 New item added to cart:', cart.shopCarts);
    }
    console.log('🛒 Cart before recalculating totals:', cart);
    this.recalculateTotals(cart);
    const check = await cart.save();
    console.log('🛒 Cart saved:', cart);
    console.log('💥 Cart after adding item:', check);
    return cart;
  }

  // ✏️ Cập nhật số lượng
  async updateQuantity(
    userId: string,
    shopId: string,
    itemId: string,
    quantity: number,
  ) {
    const cart = await this.getCartByUser(userId);
    const shopCart = cart.shopCarts.find(
      (sc) => sc.shop.toString() === shopId.toString(),
    );
    if (!shopCart) throw new NotFoundException('Shop not found');
    const item = shopCart.items.find(
      (i: any) => i._id?.toString() === itemId.toString(),
    );
    if (!item) throw new NotFoundException('Item not found');
    item.quantity = quantity;
    item.totalPrice = item.basePrice * quantity;

    this.recalculateTotals(cart);
    await cart.save();
    return cart;
  }

  // ❌ Soft delete toàn bộ giỏ của user
  async softDeleteCart(userId: string) {
    const cart = await this.cartModel.findOne({ customer: userId });
    if (!cart) throw new NotFoundException('Cart not found');
    await this.cartModel.softDelete({ _id: cart._id });
    return { message: 'Cart soft deleted' };
  }

  // ♻️ Khôi phục giỏ hàng đã soft delete
  async restoreCart(userId: string) {
    const deletedCart = await (this.cartModel as any).findOneDeleted({ customer: userId });
    if (!deletedCart) throw new NotFoundException('No deleted cart found');
    await this.cartModel.restore({ _id: deletedCart[0]._id });
    return { message: 'Cart restored' };
  }

  // 💰 Tính tổng
  recalculateTotals(cart: Cart) {
    for (const sc of cart.shopCarts) {
      sc.totalPrice = sc.items.reduce((sum, i) => sum + i.totalPrice, 0);
    }
    cart.grandTotal = cart.shopCarts.reduce((sum, sc) => sum + sc.totalPrice, 0);
  }
  // ❌ Xoá 1 sản phẩm trong giỏ của 1 shop
  async removeItem(userId: string, shopId: string, itemId: string) {
    const cart = await this.getCartByUser(userId);

    const shopCart = cart.shopCarts.find(
      (sc) => sc.shop.toString() === shopId.toString(),
    );
    if (!shopCart) throw new NotFoundException('Shop not found in cart');

    const itemIndex = shopCart.items.findIndex(
      (i: any) => i._id?.toString() === itemId.toString(),
    );
    if (itemIndex === -1) throw new NotFoundException('Item not found');

    shopCart.items.splice(itemIndex, 1);

    // Tính lại tổng
    this.recalculateTotals(cart);

    await cart.save();
    return cart;
  }

  // 🧹 Xoá toàn bộ giỏ hàng của 1 shop
  async clearShopCart(userId: string, shopId: string) {
    const cart = await this.getCartByUser(userId);

    const shopIndex = cart.shopCarts.findIndex(
      (sc) => sc.shop.toString() === shopId.toString(),
    );

    if (shopIndex === -1) throw new NotFoundException('Shop not found in cart');

    cart.shopCarts.splice(shopIndex, 1);

    // Cập nhật tổng giỏ
    this.recalculateTotals(cart);

    await cart.save();
    return cart;
  }
}
