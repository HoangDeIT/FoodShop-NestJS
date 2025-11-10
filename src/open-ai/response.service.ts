import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class ResponseService {
    private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    async generateMessage(intent: string, message: string, data: any) {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Bạn là chatbot thân thiện, hãy tạo câu trả lời tự nhiên dựa trên dữ liệu JSON.',
                },
                {
                    role: 'user',
                    content: `
    Intent: ${intent}
    Tin nhắn người dùng: "${message}"
    Dữ liệu: ${JSON.stringify(data)}
            `,
                },
            ],
        });

        return response.choices[0].message.content?.trim()!;
    }
    // async generateMessage(intent: string, userMessage: string, data: any) {
    //     // 💬 MOCK — không gọi OpenAI, chỉ trả về câu trả lời ngắn gọn
    //     switch (intent) {
    //         case 'find_store':
    //             return `Mình tìm thấy ${data?.result?.length || 2} cửa hàng gần bạn trong bán kính 3km 🏪.`;

    //         case 'find_product':
    //             return `Có vài sản phẩm phù hợp với từ khóa "${userMessage}".`;

    //         case 'best_seller':
    //             return `Đây là những cửa hàng bán chạy nhất quanh bạn.`;

    //         case 'best_rating':
    //             return `Top cửa hàng được đánh giá cao nhất ⭐.`;

    //         case 'order_status':
    //             return `Bạn có ${data?.length || 2} đơn hàng đang hoạt động 🚚.`;

    //         case 'order_summary':
    //             return `Tổng chi tiêu tháng này của bạn là ${data?.totalSpent || 250000}đ 💰.`;

    //         default:
    //             return `Xin lỗi, mình chưa hiểu rõ yêu cầu của bạn 😅.`;
    //     }
    // }
}
