import { Injectable } from '@nestjs/common';
import mongoose from 'mongoose';
import { LocationsService } from 'src/locations/locations.service';
import { OrdersService } from 'src/orders/orders.service';

@Injectable()
export class ActionService {
    constructor(private readonly locationService: LocationsService,
        private readonly ordersService: OrdersService,
    ) { }

    async findStoreNearby(
        keyword: string,
        userLocation: { lat: number; lng: number },
        radiusInKm = 10,
        sortBy: 'distance' | 'rating' = 'distance',
    ) {
        const result = await this.locationService.findSellersNearby(
            userLocation.lat,
            userLocation.lng,
            radiusInKm,
            1,
            10,
            undefined,
        );

        // Lọc theo keyword (nếu có)
        if (keyword) {
            result.result = result.result.filter((s) =>
                s.user.name.toLowerCase().includes(keyword.toLowerCase()),
            );
        }

        // Sắp xếp động
        if (sortBy === 'rating') {
            result.result.sort((a, b) => (b.user.rating ?? 0) - (a.user.rating ?? 0));
        } else if (sortBy === 'distance') {
            result.result.sort((a, b) => a.distance - b.distance);
        }

        return this.normalizeFindStoreResult(result);
    }

    async findProductNearby(
        keyword: string,
        userLocation: { lat: number; lng: number },
        radiusInKm = 10,
        sortBy: 'distance' | 'price_asc' | 'price_desc' = 'distance',
        priceRange?: { min?: number; max?: number },
    ) {
        const result = await this.locationService.findProductsNearby(
            keyword,
            userLocation.lat,
            userLocation.lng,
            radiusInKm,
            1,
            15,
        );

        let products = result.result;

        // Lọc giá
        if (priceRange?.min != null && priceRange.min !== undefined) {
            products = products.filter((p) => p.products.basePrice >= priceRange.min!);
        }
        if (priceRange?.max != null && priceRange.max !== undefined) {
            products = products.filter((p) => p.products.basePrice <= priceRange.max!);
        }

        // Sắp xếp
        if (sortBy === 'price_asc') {
            products.sort((a, b) => a.products.basePrice - b.products.basePrice);
        } else if (sortBy === 'price_desc') {
            products.sort((a, b) => b.products.basePrice - a.products.basePrice);
        } else {
            products.sort((a, b) => a.distance - b.distance);
        }

        result.result = products;
        const resultFormatted = this.normalizeFindProductResult(result);
        return resultFormatted;
    }

    async getBestSeller(userId: string) {
        const result = await this.locationService.findNearbySellerTypes(userId);
        return this.normalizeFindStoreResult(result.topSelling);
    }

    async getBestRating(userId: string) {
        const result = await this.locationService.findNearbySellerTypes(userId);
        return this.normalizeFindStoreResult(result.topRated);
    }
    async getUserActiveOrders(userId: string) {
        const orders = await this.ordersService.findAll(1, 10, `customerId=${userId}`);
        const active = orders.result.filter(
            (o) => o.orderStatus !== 'completed' && o.orderStatus !== 'cancelled',
        );

        // map dữ liệu gọn
        return active.map((o) => ({
            id: o._id,
            //@ts-ignore
            shop: o.shop?.name || 'Unknown',
            total: o.totalPrice,
            status: o.orderStatus,
            createdAt: o.orderDate,
        }));
    }

    /**
     * 💰 Tổng chi tiêu tháng này (và số đơn)
     */
    async getMonthlyOrderSummary(userId: string) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const result = await this.ordersService['orderModel'].aggregate([
            {
                $match: {
                    customer: new mongoose.Types.ObjectId(userId),
                    orderStatus: { $ne: 'cancelled' },
                    createdAt: { $gte: startOfMonth },
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: null,
                    totalSpent: { $sum: '$totalPrice' },
                    totalOrders: { $sum: 1 },
                },
            },
        ]);

        return {
            totalSpent: result?.[0]?.totalSpent || 0,
            totalOrders: result?.[0]?.totalOrders || 0,
            month: `${now.getMonth() + 1}/${now.getFullYear()}`,
        };
    }


    //format data
    private normalizeFindProductResult(rawData: any) {
        if (!rawData?.result?.length) return [];

        return rawData.result.map((item: any) => ({
            shopName: item.user?.name || 'Cửa hàng không xác định',
            shopAvatar: item.user?.avatar || null,
            address: item.address,
            productName: item.products?.name,
            productImage: item.products?.image,
            price: item.products?.basePrice ?? 0,
            sold: item.products?.sold ?? 0,
            distanceKm: Number(item.distance?.toFixed(2)) || 0,
        }));
    }
    private normalizeFindStoreResult(rawData: any) {
        // Nếu không có dữ liệu hoặc không phải mảng
        if (!rawData) return [];

        // Một số trường hợp (như best_rating) trả trực tiếp mảng thay vì data.result
        const list = Array.isArray(rawData.result) ? rawData.result : rawData;

        if (!list.length) return [];

        return list.map((item: any) => {
            // 🧩 Tự động chọn nguồn dữ liệu (user hoặc seller)
            const source = item.user || item.seller || {};

            return {
                shopName: source.name || 'Cửa hàng không xác định',
                shopAvatar: source.avatar || null,
                description: source.description || null,
                address: item.address || 'Không có địa chỉ',
                distanceKm: Number(item.distance?.toFixed(2)) || 0,
                rating: item.avgRating ?? null,
                isOpen: source.isOpen ?? null,
            };
        });
    }

}

