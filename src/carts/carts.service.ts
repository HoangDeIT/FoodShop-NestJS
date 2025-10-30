import { Injectable } from '@nestjs/common';
import { ProductsService } from 'src/products/products.service';
import { UsersService } from 'src/users/users.service';

// ==============================
// 🧾 Interfaces
// ==============================
interface CartItemInput {
  productId: string;
  productName: string;
  basePrice: number;
  quantity: number;
  sizeId?: string;
  sizeName?: string;
  toppingIds?: string[];
  toppingNames?: string[];
}

interface ShopCartInput {
  shopId: string;
  items: CartItemInput[];
}

interface ValidatedCartItem {
  productId: string;
  productName: string;
  basePrice: number;
  sizePrice: number;
  toppingPrice: number;
  quantity: number;
  totalPrice: number;
  image?: string;
  sizeId?: string;
  sizeName?: string;
  toppingIds?: string[];
  toppingNames?: string[];
}

interface ValidatedShopCart {
  shopId: string;
  shopName: string;
  // avatar?: string; // ❌ Không cần avatar shop trong giỏ hàng
  totalPrice: number;
  items: ValidatedCartItem[];
}

export interface ValidatedCartResponse {
  shopCarts: ValidatedShopCart[];
  grandTotal: number;
}

@Injectable()
export class CartsService {
  constructor(
    private readonly productService: ProductsService,
    private readonly usersService: UsersService,
  ) { }

  async validateClientCart(
    cartData: { shopCarts: ShopCartInput[] },
  ): Promise<ValidatedCartResponse> {
    if (!cartData?.shopCarts?.length) {
      return { shopCarts: [], grandTotal: 0 };
    }

    const validatedShops: ValidatedShopCart[] = [];

    for (const shopCart of cartData.shopCarts) {
      const shop = await this.usersService.findOne(shopCart.shopId);

      // ❌ Shop bị xóa hoặc tạm đóng
      if (!shop || shop.isDeleted || shop.isOpen === false) continue;

      const validItems: ValidatedCartItem[] = [];

      for (const item of shopCart.items) {
        const product = await this.productService.findOne(item.productId);

        // ❌ Sản phẩm không tồn tại / bị xóa / ngưng bán
        if (!product || product.isDeleted || product.inStock === false) continue;

        let basePrice = product.basePrice;
        let sizePrice = 0;
        let toppingPrice = 0;
        let sizeName = item.sizeName;
        let toppingNames: string[] = [];
        const validToppings: string[] = [];

        // 🧩 Kiểm tra size hợp lệ
        if (item.sizeId) {
          const size = product.sizes?.find(
            (s) => s._id.toString() === item.sizeId,
          );
          if (size) {
            sizePrice = size.price || 0;
            sizeName = size.name;
          } else {
            // ❌ Size không tồn tại => loại bỏ item
            continue;
          }
        }

        // 🧩 Kiểm tra topping hợp lệ
        if (item.toppingIds?.length) {
          for (const tid of item.toppingIds) {
            const topping = product.toppings?.find(
              (t) => t._id.toString() === tid,
            );
            if (topping) {
              validToppings.push(topping._id.toString());
              toppingNames.push(topping.name);
              toppingPrice += topping.price || 0;
            }
          }
        }

        // ✅ Cập nhật item hợp lệ
        const totalUnitPrice = basePrice + sizePrice + toppingPrice;
        const totalPrice = totalUnitPrice * item.quantity;

        validItems.push({
          productId: product._id.toString(),
          productName: product.name,
          basePrice,
          sizePrice,
          toppingPrice,
          quantity: item.quantity,
          totalPrice,
          image: product.image, // 🖼️ Giữ lại ảnh sản phẩm
          sizeId: item.sizeId,
          sizeName,
          toppingIds: validToppings,
          toppingNames,
        });
      }

      // ❗ Chỉ thêm shop nếu có ít nhất 1 item hợp lệ
      if (validItems.length > 0) {
        const totalPrice = validItems.reduce((s, i) => s + i.totalPrice, 0);
        validatedShops.push({
          shopId: shop._id.toString(),
          shopName: shop.name,
          // avatar: shop.avatar, // ❌ Không cần avatar trong giỏ hàng
          totalPrice,
          items: validItems,
        });
      }
    }

    // 🧮 Tổng toàn bộ
    const grandTotal = validatedShops.reduce((sum, s) => sum + s.totalPrice, 0);

    return { shopCarts: validatedShops, grandTotal };
  }
}
