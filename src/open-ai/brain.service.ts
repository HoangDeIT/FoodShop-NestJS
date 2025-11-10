import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class BrainService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async detectIntent(message: string): Promise<{
    intent: string;
    keyword?: string;
    radiusKm?: number;
    priceRange?: { min?: number; max?: number };
    sortBy?: 'price_asc' | 'price_desc' | 'distance' | 'rating';
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `
  Bạn là bộ phân tích ý định (intent parser) cho chatbot thương mại điện tử.
  Hãy đọc kỹ tin nhắn người dùng và TRẢ VỀ DUY NHẤT MỘT CHUỖI JSON hợp lệ (không thêm mô tả) theo mẫu sau:

  {
    "intent": "find_store" | "find_product" | "best_seller" | "best_rating" | "order_status" | "order_summary",
    "keyword": "chuỗi từ khóa chính người dùng tìm (vd: trà sữa, cà phê, cơm gà...) hoặc để rỗng nếu không có",
    "radiusKm": "bán kính tính theo km nếu người dùng có nói rõ, nếu không thì để 10",
    "priceRange": { "min": 0, "max": 50000 } // CHỈ THÊM nếu người dùng có nói về giá (vd: 'rẻ nhất', 'dưới 50k', 'trên 20k'), nếu không thì BỎ LUÔN TRƯỜNG NÀY,
    "sortBy": "price_asc" | "price_desc" | "distance" | "rating" // nếu không rõ thì để distance
  }

  ⚠️ Luôn trả về JSON hợp lệ, không thêm giải thích, không thêm văn bản ngoài JSON.
            `,
        },
        { role: 'user', content: message },
      ],
    });


    const raw = response.choices[0].message.content?.trim() || '{}';
    try {
      return JSON.parse(raw);
    } catch {
      // fallback: nếu AI trả về chuỗi rác
      return { intent: 'unknown' };
    }
  }
  // async detectIntent(message: string): Promise<any> {
  //   // 🧠 MOCK — tạm thời hardcode vài intent để test
  //   const lower = message.toLowerCase();

  //   // Trả JSON như thật, giả lập AI
  //   if (lower.includes('đơn hàng') || lower.includes('order')) {
  //     if (lower.includes('tới đâu') || lower.includes('đang giao')) {
  //       return { intent: 'order_status' };
  //     } else if (lower.includes('tổng') || lower.includes('tháng')) {
  //       return { intent: 'order_summary' };
  //     }
  //   }

  //   if (lower.includes('bánh mì') || lower.includes('cà phê')) {
  //     return {
  //       intent: 'find_product',
  //       keyword: 'Bánh mì',
  //       radiusKm: 5,
  //       sortBy: 'price_asc',
  //     };
  //   }

  //   if (lower.includes('mẹ') || lower.includes('quán')) {
  //     return {
  //       intent: 'find_store',
  //       keyword: 'Nhà Mẹ',
  //       radiusKm: 3,
  //     };
  //   }

  //   // Default
  //   return { intent: 'unknown' };
  // }
}
