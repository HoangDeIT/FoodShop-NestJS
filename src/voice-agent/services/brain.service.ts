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

  async plan(dto: VoiceRequestDto) {
    // 👉 hardcode để test trước (sau thay bằng GPT)
    const currentPage = dto.currentPage;
    const text = dto.message.toLowerCase();
    if (text.includes("trà sữa")) {
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
    if (
      (text.includes("nhắn") || text.includes("nhắn tin")) &&
      (text.includes("shop") || text.includes("quán")) &&
      (
        text.includes("order vừa đặt") ||
        text.includes("đơn vừa đặt") ||
        text.includes("shop sau với order vừa đặt") ||
        text.includes("shop sau đơn vừa đặt")
      )
    ) {
      return {
        message: "Để mình mở chat của shop từ đơn vừa đặt rồi nhắn giúp bạn nha~ 💬",
        feActions: [],
        beActions: [
          {
            id: "be_1",
            type: "FIND_CUSTOMER_ORDER",
            payload: {
              rank: 1
            }
          },
          {
            id: "be_2",
            type: "FIND_ORDER_CONVERSATION",
            payload: {}
          }
        ]
      };
    }

    if (
      text.includes("đọc") &&
      (text.includes("3 tin nhắn") || text.includes("ba tin nhắn")) &&
      text.includes("shop mới order")
    ) {
      return {
        message: "Để mình đọc 3 tin nhắn của shop mới order nha~",
        feActions: [],
        beActions: [
          {
            id: "be_1",
            type: "FIND_CUSTOMER_ORDER",
            payload: {
              rank: 1
            }
          },
          {
            id: "be_2",
            type: "FIND_ORDER_CONVERSATION"
          },
          {
            id: "be_3",
            type: "GET_RECENT_MESSAGES",
            payload: {
              limit: 3
            }
          }
        ]
      };
    }

    if (
      text.includes("đọc") &&
      text.includes("3 tin nhắn")
    ) {
      const ctx = dto.context || {};
      if (currentPage === "chat_detail" && ctx.conversationId) {
        return {
          message: "Để mình đọc 3 tin nhắn gần nhất của đoạn chat này nha~",
          feActions: [],
          beActions: [
            {
              id: "be_1",
              type: "GET_CONVERSATION_MESSAGES",
              payload: {
                conversationId: ctx.conversationId,
                limit: 3
              }
            }
          ]
        };
      }

      return {
        message: "Mình chưa biết bạn muốn đọc tin nhắn nào nè~ hãy mở đúng đoạn chat trước nha.",
        feActions: [],
        beActions: []
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
    // 1️⃣ flow chat trước
    if (context.conversation?._id && context.messages?.length) {
      const ordered = [...context.messages].reverse();

      const textToRead = ordered
        .map((m: any, index: number) => {
          const senderName =
            typeof m.senderId === "object" ? m.senderId.name : "Người dùng";

          const content =
            typeof m.data === "string"
              ? m.data
              : m.data?.message || "Tin nhắn đặc biệt";

          return `Tin ${index + 1}, ${senderName} nói: ${content}`;
        })
        .join(". ");

      return {
        message: "Mình mở đoạn chat của shop mới order rồi đọc 3 tin nhắn cho bạn nè~",
        actions: [
          {
            type: "NAVIGATE",
            delay: 0,
            payload: {
              url: `/(stack)/chat/${context.conversation._id}`,
              id: context.conversation._id.toString(),
            }
          },
          {
            type: "READ_CHAT_MESSAGES",
            delay: 900,
            payload: {
              conversationId: context.conversation._id.toString(),
              text: textToRead
            }
          }
        ]
      };
    }

    // 2️⃣ flow nhắn tin
    if (context.conversation?._id) {
      return {
        message: "Mình mở đoạn chat và nhắn cho shop rồi nè~ 💬",
        actions: [
          {
            type: "NAVIGATE",
            delay: 0,
            payload: {
              url: `/(stack)/chat/${context.conversation._id}`,
              id: context.conversation._id.toString(),
            }
          },
          {
            type: "SET_CHAT_INPUT",
            delay: 500,
            payload: {
              conversationId: context.conversation._id.toString(),
              text: "chào bạn ,tôi là đệ"
            }
          },
          {
            type: "SUBMIT_CHAT_MESSAGE",
            delay: 1200,
            payload: {
              conversationId: context.conversation._id.toString()
            }
          }
        ]
      };
    }
    // 3️⃣ flow product
    const item = context.product?.[0];
    if (!item) {
      return {
        message: "Không tìm thấy dữ liệu phù hợp nyaa 😭",
        actions: []
      };
    }

    const product = item.products;
    const size = product.sizes?.find((s: any) => s.isDefault) || product.sizes?.[0];
    const toppingList = product.toppings || [];
    const selectedToppings = toppingList.slice(0, 1);

    const toppingIds = selectedToppings.map((t: any) => t._id);
    const toppingNames = selectedToppings.map((t: any) => t.name);
    const toppingPrice = selectedToppings.reduce((sum: number, t: any) => sum + t.price, 0);

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