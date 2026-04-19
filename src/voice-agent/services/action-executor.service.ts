import { Injectable } from "@nestjs/common";
import { BrainService } from "./brain.service";
import { UsersService } from "src/users/users.service";
import { DomainService } from "./domain.service";
import { ChatsService } from "src/chats/chats.service";

@Injectable()
export class ActionExecutorService {

    constructor(
        private readonly brain: BrainService,
        private readonly usersService: UsersService,
        private readonly domainServices: DomainService,
        private readonly chatsService: ChatsService
    ) { }
    async executeBatch(
        message: string,
        currentPage: string,
        uiContext: Record<string, any>,
        beActions: any[],
        feActions: any[],
        userId: string
    ) {
        // ❌ nếu FE fail → dừng
        const failedFE = feActions.find(a => a.status === "failed");
        const user = await this.usersService.findOne({ id: userId });
        const needsLocation = beActions.some((a) =>
            ["FIND_PRODUCTS", "FIND_STORE"].includes(a.type)
        );

        if (failedFE || !user) {
            return {
                message: "Một thao tác trên thiết bị thất bại rồi nyaa~ 😢",
                actions: []
            };
        }

        if (needsLocation && !user.profile?.location) {
            return {
                message: "Mình cần vị trí của bạn để xử lý yêu cầu này nè~ 📍",
                actions: []
            };
        }
        // 🌸 context chung (thay vì product)
        const context: any = {
            userInput: message,
            ui: {
                currentPage,
                context: uiContext,
            }
        };

        // 👉 STEP 1: BE xử lý → build context
        for (const action of beActions) {
            switch (action.type) {
                case "FIND_PRODUCTS":
                    context.product = await this.domainServices.searchProductsAdvanced({
                        keyword: action.payload.keyword,
                        latitude: user?.profile?.location?.latitude!,
                        longitude: user?.profile?.location?.longitude!,
                        radiusInKm: action.payload.radiusInKm ?? 10,
                        sortBy: action.payload.sortBy,
                        priority: action.payload.priority,
                        userId: userId,
                        limit: action.payload.limit,
                    });
                    break;

                case "FIND_STORE":
                    context.store = await this.domainServices.searchSellersAdvanced({
                        latitude: user?.profile?.location?.latitude!,
                        longitude: user?.profile?.location?.longitude!,
                        radiusInKm: action.payload.radiusInKm ?? 10,
                        sortBy: action.payload.sortBy,
                        priority: action.payload.priority,
                        userId: userId,
                    });
                    break;
                case "FIND_CUSTOMER_ORDER":
                    context.order = await this.domainServices.findCustomerOrdersForAI({
                        customerId: userId,
                        rank: action.payload?.rank ?? 1,
                        statuses: action.payload?.statuses,
                    });
                    break;

                case "FIND_ORDER_CONVERSATION":
                    if (!context.order?.shop?._id) break;

                    context.conversation = await this.chatsService.createConversation(
                        userId,
                        context.order.shop._id.toString()
                    );
                    break;

                case "GET_RECENT_MESSAGES":
                    if (!context.conversation?._id) break;

                    context.messages = await this.chatsService.getRecentMessages(
                        context.conversation._id.toString(),
                        action.payload?.limit ?? 3
                    );
                    break;

                case "GET_CONVERSATION_MESSAGES":
                    if (!action.payload?.conversationId) break;

                    context.messages = await this.chatsService.getRecentMessages(
                        action.payload.conversationId,
                        action.payload?.limit ?? 3
                    );
                    context.conversation = { _id: action.payload.conversationId };
                    break;
                case "GET_PRODUCT_REVIEWS_CONTEXT": {
                    const productId =
                        action.payload?.productId ||
                        uiContext?.productId ||
                        uiContext?.product?._id;

                    if (!productId) break;

                    context.reviewTarget = await this.domainServices.getProductReviewContext({
                        productId,
                        limit: action.payload?.limit ?? 10,
                    });
                    context.reviewIntent = action.payload?.intent;
                    break;
                }
                default:
                    break;
            }
        }

        // ❌ không có data
        const hasContextData =
            !!context.product ||
            !!context.store ||
            !!context.order ||
            !!context.conversation ||
            !!context.messages ||
            !!context.reviewTarget;

        if (!hasContextData) {
            return {
                message: "Không tìm thấy dữ liệu phù hợp nyaa~ 😭",
                actions: []
            };
        }
        // 🧠 STEP 2: gọi Brain build response (hardcode trước)
        return this.brain.buildResponse(context);
    }
}
