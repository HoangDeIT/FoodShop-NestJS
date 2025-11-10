import { Injectable } from '@nestjs/common';
import { BrainService } from './brain.service';
import { ResponseService } from './response.service';
import { ActionService } from './action.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AiOrchestratorService {
    constructor(
        private readonly brain: BrainService,
        private readonly actions: ActionService,
        private readonly responder: ResponseService,
        private readonly userService: UsersService,
    ) { }

    async handleUserMessage(userMessage: string, userId: string) {
        // 🧠 1️⃣ Gọi AI để lấy thông tin có cấu trúc
        const parsed = await this.brain.detectIntent(userMessage);

        const user = await this.userService.findOne(userId);
        const userLocation = {
            lat: user?.location?.latitude!,
            lng: user?.location?.longitude!,
        };

        const intent = parsed.intent || 'unknown';
        const radius = parsed.radiusKm ?? 10; // default 10km
        const keyword = parsed.keyword?.trim() || '';
        const sortBy = parsed.sortBy || 'distance';
        const priceRange = parsed.priceRange || {};

        let data: any;

        // ⚙️ 2️⃣ Điều phối hành động theo intent
        switch (intent) {
            case 'find_store':
                data = await this.actions.findStoreNearby(
                    keyword,
                    userLocation,
                    radius,
                    sortBy as any,
                );
                break;

            case 'find_product':
                data = await this.actions.findProductNearby(
                    keyword,
                    userLocation,
                    radius,
                    sortBy as any,
                    priceRange,
                );
                break;

            case 'best_seller':
                data = await this.actions.getBestSeller(userId);
                break;

            case 'best_rating':
                data = await this.actions.getBestRating(userId);
                break;
            case 'order_status':
                data = await this.actions.getUserActiveOrders(userId);
                break;
            case 'order_summary':
                data = await this.actions.getMonthlyOrderSummary(userId);
                break;
            default:
                data = { message: 'Xin lỗi, tôi chưa hiểu rõ yêu cầu của bạn.' };
        }

        // 💬 3️⃣ Trả lời tự nhiên
        const message = await this.responder.generateMessage(intent, userMessage, data);
        return { intent, message, data, meta: parsed };
    }
}
