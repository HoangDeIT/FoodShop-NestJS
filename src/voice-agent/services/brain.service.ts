import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { VoiceRequestDto } from "../dto/voice-request.dto";

@Injectable()
export class BrainService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  //   async plan(dto: any) {
  //     const prompt = `
  // User: "${dto.message}"

  // Trả JSON:
  // {
  //   "message": "...",
  //   "feActions": [
  //     { "id": "a1", "type": "REQUEST_LOCATION" }
  //   ],
  //   "beActions": [
  //     { "id": "a2", "type": "FIND_NEAREST_PRODUCT" }
  //   ]
  // }
  // `;

  //     const res = await this.openai.chat.completions.create({
  //       model: "gpt-4.1-mini",
  //       messages: [{ role: "user", content: prompt }],
  //       response_format: { type: "json_object" }
  //     });

  //     return JSON.parse(res.choices[0].message.content!);
  //   } 

  async plan(dto: any) {
    // 👉 hardcode để test trước (sau thay bằng GPT)

    if (dto.message.includes("trà sữa")) {
      return {
        message: "Để mình tìm trà sữa gần bạn nha",

        // 👉 FE phải làm trước
        feActions: [
          // {
          //   id: "fe_1",
          //   type: "REQUEST_LOCATION"
          // },
          {
            id: "fe_2",
            type: "CLEAR_CART"
          }
        ],

        // 👉 BE sẽ làm sau
        beActions: [
          {
            id: "be_1",
            type: "FIND_PRODUCTS",
            payload: {
              keyword: "trà sữa"
            }
          }
        ]
      };
    }

    return {
      message: "Mình chưa hiểu ý bạn nyaa~ 😢",
      feActions: [],
      beActions: []
    };
  }
  //   async buildResponse(input: any) {
  //     const prompt = `
  // User: ${input.userInput}

  // Data từ hệ thống:
  // ${JSON.stringify(input.data)}

  // Trả JSON:
  // {
  //   "message": "...",
  //   "actions": [
  //     { "type": "ADD_TO_CART", "payload": {} },
  //     { "type": "ORDER", "payload": {} }
  //   ],
  //   "requiresInput": false
  // }
  // `;

  //     const res = await this.openai.chat.completions.create({
  //       model: "gpt-4.1-mini",
  //       messages: [{ role: "user", content: prompt }],
  //       response_format: { type: "json_object" }
  //     });

  //     return JSON.parse(res.choices[0].message.content!);
  //   }
  async buildResponse(context: any) {
    const item = context.product?.[0];
    if (!item) {
      return {
        message: "Không tìm thấy sản phẩm nyaa 😭",
        actions: []
      };
    }

    const product = item.products;

    // 🎯 chọn size mặc định
    const size = product.sizes?.find(s => s.isDefault) || product.sizes?.[0];

    // 🎯 chọn topping (ví dụ: chọn 1 cái đầu)
    const toppingList = product.toppings || [];
    const selectedToppings = toppingList.slice(0, 1);

    const toppingIds = selectedToppings.map(t => t._id);
    const toppingNames = selectedToppings.map(t => t.name);
    const toppingPrice = selectedToppings.reduce((sum, t) => sum + t.price, 0);

    return {
      message: "Mình đã thêm món, điền thông tin và đặt hàng giúp bạn luôn nè 🧋✨",
      actions: [
        {
          type: "ADD_TO_CART",
          delay: 0,
          payload: {
            shopId: item.user._id,
            shopName: item.user.name,

            productId: product._id,
            productName: product.name,

            basePrice: product.basePrice,

            sizeId: size?._id?.toString() || "",
            sizeName: size?.name || "",
            sizePrice: size?.price || 0,

            toppingIds,
            toppingNames,
            toppingPrice,

            quantity: 1,
            image: product.image || ""
          }
        },
        {
          type: "NAVIGATE",
          delay: 300,
          payload: { url: "/cart" }
        },
        {
          type: "NAVIGATE",
          delay: 500,
          payload: { url: "/(stack)/checkout" }
        },
        {
          type: "SET_CHECKOUT_INFO",
          delay: 900,
          payload: {
            receiverName: "Hoàng Đệ",
            receiverPhone: "0909123456"
          }
        },
        {
          type: "SUBMIT_ORDER",
          delay: 1400,
          payload: {}
        },
        {
          type: "NAVIGATE",
          delay: 2200,
          payload: {
            url: "/(tabs)/order",
            isRefresh: true
          }
        }
      ],
      requiresInput: false
    };
  }
}