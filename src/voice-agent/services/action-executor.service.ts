import { Injectable } from "@nestjs/common";
import { BrainService } from "./brain.service";
import { UsersService } from "src/users/users.service";
import { DomainService } from "./domain.service";

@Injectable()
export class ActionExecutorService {

    constructor(
        private readonly brain: BrainService,
        private readonly usersService: UsersService,
        private readonly domainServices: DomainService,
    ) { }
    async executeBatch(beActions: any[], feActions: any[], userId: string) {
        // ❌ nếu FE fail → dừng
        const failedFE = feActions.find(a => a.status === "failed");
        const user = await this.usersService.findOne({ id: userId });
        if (failedFE || !user || !user.profile?.location) {
            return {
                message: "Một thao tác trên thiết bị thất bại rồi nyaa~ 😢",
                actions: []
            };
        }

        // 🌸 context chung (thay vì product)
        const context: any = {};

        // 👉 STEP 1: BE xử lý → build context
        for (const action of beActions) {
            switch (action.type) {
                case "FIND_PRODUCTS":
                    context.product = await this.domainServices.searchProductsAdvanced({
                        keyword: action.payload.keyword,
                        latitude: user?.profile?.location?.latitude,
                        longitude: user?.profile?.location?.longitude,
                        radiusInKm: action.payload.radiusInKm ?? 10,
                        sortBy: action.payload.sortBy,
                        priority: action.payload.priority,
                        userId: userId,
                        limit: action.payload.limit,
                    });
                    break;

                case "FIND_STORE":
                    context.store = await this.domainServices.searchSellersAdvanced({
                        latitude: user?.profile?.location?.latitude,
                        longitude: user?.profile?.location?.longitude,
                        radiusInKm: action.payload.radiusInKm ?? 10,
                        sortBy: action.payload.sortBy,
                        priority: action.payload.priority,
                        userId: userId,
                    });
                    break;

                default:
                    break;
            }
        }

        // ❌ không có data
        if (!context.product && !context.store) {
            return {
                message: "Không tìm thấy dữ liệu phù hợp nyaa~ 😭",
                actions: []
            };
        }

        // 🧠 STEP 2: gọi Brain build response (hardcode trước)
        return this.brain.buildResponse(context);
    }
}