import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Types } from "mongoose";
import { SoftDeleteModel } from "soft-delete-plugin-mongoose";
import { Conversation, ConversationDocument } from "src/chats/schemas/conversation.schema";
import { Location, LocationDocument } from "src/locations/schemas/location.schema";
import { Order, OrderDocument } from "src/orders/schemas/order.schema";

@Injectable()
export class DomainService {
    constructor(
        @InjectModel(Location.name) private readonly locationModel: SoftDeleteModel<LocationDocument>,
        @InjectModel(Order.name) private readonly orderModel: SoftDeleteModel<OrderDocument>,
        @InjectModel(Conversation.name) private readonly conversationModel: SoftDeleteModel<ConversationDocument>,
    ) { }
    async searchProductsAdvanced(params: {
        keyword?: string;
        latitude: number;
        longitude: number;
        radiusInKm?: number;

        sortBy?: "nearest" | "cheapest" | "expensive";
        priority?: "none" | "liked" | "ordered";

        userId?: string;
        limit?: number;
    }) {
        const {
            keyword = "",
            latitude,
            longitude,
            radiusInKm = 10,
            sortBy = "nearest",
            priority = "none",
            userId,
            limit = 10,
        } = params;

        const radiusInMeters = radiusInKm * 1000;

        const pipeline: mongoose.PipelineStage[] = [];

        // 🟢 1. GEO
        pipeline.push({
            $geoNear: {
                near: { type: "Point", coordinates: [longitude, latitude] },
                distanceField: "distance",
                maxDistance: radiusInMeters,
                spherical: true,
            },
        });

        // 🟢 2. seller + user
        pipeline.push(
            {
                $lookup: {
                    from: "sellerprofiles",
                    localField: "_id",
                    foreignField: "location",
                    as: "seller",
                },
            },
            { $unwind: "$seller" },

            {
                $lookup: {
                    from: "users",
                    localField: "seller.userId",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" }
        );

        // 🟢 3. filter seller
        pipeline.push({
            $match: {
                "user.role": "seller",
                "user.isDeleted": { $ne: true },
                "user.status": "active",
                "seller.isOpen": true,
            },
        });

        // 🟢 4. products
        pipeline.push(
            {
                $lookup: {
                    from: "products",
                    localField: "user._id",
                    foreignField: "seller",
                    as: "products",
                },
            },
            { $unwind: "$products" }
        );

        // 🟢 5. filter product
        pipeline.push({
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
        });

        // 🟡 6. LIKE priority
        if (priority === "liked" && userId) {
            pipeline.push({
                $lookup: {
                    from: "likes",
                    let: { shopId: "$user._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$shop", "$$shopId"] },
                                        { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
                                        { $ne: ["$isDeleted", true] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "liked",
                },
            });

            pipeline.push({
                $addFields: {
                    isLiked: { $gt: [{ $size: "$liked" }, 0] },
                },
            });
        }

        // 🟡 7. ORDER priority
        if (priority === "ordered" && userId) {
            pipeline.push({
                $lookup: {
                    from: "orders",
                    let: { shopId: "$user._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$shop", "$$shopId"] },
                                        { $eq: ["$customer", new mongoose.Types.ObjectId(userId)] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "ordered",
                },
            });

            pipeline.push({
                $addFields: {
                    isOrdered: { $gt: [{ $size: "$ordered" }, 0] },
                },
            });
        }

        // 🟢 8. SORT
        const sortStage: any = {};

        if (priority === "liked") sortStage.isLiked = -1;
        if (priority === "ordered") sortStage.isOrdered = -1;

        if (sortBy === "nearest") sortStage.distance = 1;
        if (sortBy === "cheapest") sortStage["products.basePrice"] = 1;
        if (sortBy === "expensive") sortStage["products.basePrice"] = -1;

        pipeline.push({ $sort: sortStage });

        // 🟢 9. LIMIT ONLY (✨ thay pagination)
        pipeline.push({ $limit: limit });

        // 🟢 10. PROJECT
        pipeline.push({
            $project: {
                _id: 0,
                distance: { $divide: ["$distance", 1000] },

                "user._id": 1,
                "user.name": 1,

                "products._id": 1,
                "products.name": 1,
                "products.basePrice": 1,

                // ✅ thêm vào
                "products.sizes": 1,
                "products.toppings": 1,
                "products.image": 1,

                isLiked: 1,
                isOrdered: 1,
            },
        });

        const result = await this.locationModel.aggregate(pipeline);

        return result;
    }
    async searchSellersAdvanced(params: {
        latitude: number;
        longitude: number;
        radiusInKm?: number;

        keyword?: string;

        sortBy?: "nearest" | "rating" | "popular";
        priority?: "none" | "liked" | "ordered";

        userId?: string;
        limit?: number;
    }) {
        const {
            latitude,
            longitude,
            radiusInKm = 10,
            keyword = "",
            sortBy = "nearest",
            priority = "none",
            userId,
            limit = 10,
        } = params;

        const radiusInMeters = radiusInKm * 1000;

        const pipeline: mongoose.PipelineStage[] = [];

        // 🟢 1. GEO
        pipeline.push({
            $geoNear: {
                near: { type: "Point", coordinates: [longitude, latitude] },
                distanceField: "distance",
                maxDistance: radiusInMeters,
                spherical: true,
            },
        });

        // 🟢 2. JOIN sellerProfile
        pipeline.push(
            {
                $lookup: {
                    from: "sellerprofiles",
                    localField: "_id",
                    foreignField: "location",
                    as: "seller",
                },
            },
            { $unwind: "$seller" }
        );

        // 🟢 3. JOIN user
        pipeline.push(
            {
                $lookup: {
                    from: "users",
                    localField: "seller.userId",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" }
        );

        // 🟢 4. FILTER
        pipeline.push({
            $match: {
                "user.role": "seller",
                "user.status": "active",
                "user.isDeleted": { $ne: true },
                "seller.isOpen": true,
                $or: [
                    { "seller.shopName": { $regex: keyword, $options: "i" } },
                    { "seller.description": { $regex: keyword, $options: "i" } },
                ],
            },
        });

        // 🟡 5. LIKE
        if (priority === "liked" && userId) {
            pipeline.push({
                $lookup: {
                    from: "likes",
                    let: { shopId: "$user._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$shop", "$$shopId"] },
                                        { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
                                        { $ne: ["$isDeleted", true] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "liked",
                },
            });

            pipeline.push({
                $addFields: {
                    isLiked: { $gt: [{ $size: "$liked" }, 0] },
                },
            });
        }

        // 🟡 6. ORDER HISTORY
        if (priority === "ordered" && userId) {
            pipeline.push({
                $lookup: {
                    from: "orders",
                    let: { shopId: "$user._id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$shop", "$$shopId"] },
                                        { $eq: ["$customer", new mongoose.Types.ObjectId(userId)] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "ordered",
                },
            });

            pipeline.push({
                $addFields: {
                    isOrdered: { $gt: [{ $size: "$ordered" }, 0] },
                },
            });
        }

        // 🟢 7. SORT
        const sortStage: any = {};

        if (priority === "liked") sortStage.isLiked = -1;
        if (priority === "ordered") sortStage.isOrdered = -1;

        if (sortBy === "nearest") sortStage.distance = 1;
        if (sortBy === "rating") sortStage["seller.rating"] = -1;
        if (sortBy === "popular") sortStage["seller.orderCount"] = -1;

        pipeline.push({ $sort: sortStage });

        // 🟢 8. LIMIT
        pipeline.push({ $limit: limit });

        // 🟢 9. PROJECT
        pipeline.push({
            $project: {
                _id: 0,
                distance: { $divide: ["$distance", 1000] },

                "user._id": 1,
                "user.name": 1,

                "seller.shopName": 1,
                "seller.description": 1,
                "seller.rating": 1,
                "seller.totalReviews": 1,
                "seller.orderCount": 1,
                "seller.likeCount": 1,

                isLiked: 1,
                isOrdered: 1,
            },
        });

        const result = await this.locationModel.aggregate(pipeline);

        return result;
    }
    async findCustomerOrdersForAI(params: {
        customerId: string;
        rank?: number;
        statuses?: string[];
    }) {
        const { customerId, rank = 1, statuses } = params;

        const query: any = {
            customer: new Types.ObjectId(customerId),
            isDeleted: false,
        };

        if (statuses?.length) {
            query.orderStatus = { $in: statuses };
        }

        const skip = Math.max(rank - 1, 0);

        return this.orderModel
            .findOne(query)
            .populate([
                { path: "shop", select: "name email" },
                { path: "customer", select: "name email" },
                { path: "deliveryAddress" },
            ])
            .sort({ createdAt: -1 })
            .skip(skip)
            .lean();
    }
    async findOrCreateConversation(userA: string, userB: string) {
        let convo = await this.conversationModel.findOne({
            participants: { $all: [userA, userB] },
        });

        if (!convo) {
            convo = await this.conversationModel.create({
                participants: [userA, userB],
                createdAt: new Date(),
            });
        }

        return convo;
    }
}