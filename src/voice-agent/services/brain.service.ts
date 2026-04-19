import { Injectable } from "@nestjs/common";
import { VoiceRequestDto } from "../dto/voice-request.dto";

@Injectable()
export class BrainService {
  async plan(dto: VoiceRequestDto) {
    const currentPage = dto.currentPage;
    const ctx = dto.context || {};
    const text = dto.message.toLowerCase();

    const productId = ctx.productId || ctx.product?._id;
    const isProductDetailPage = currentPage === "product_detail" && !!productId;
    const wantsReviewSummary =
      /(tổng hợp|tóm tắt|summary|nhận xét)/i.test(text) &&
      /(bình luận|đánh giá|review|comment)/i.test(text);
    const wantsReviewComment =
      /(bình luận|đánh giá|review|comment)/i.test(text) &&
      /(viết|gửi|đăng|cho|giúp)/i.test(text);

    if (isProductDetailPage && wantsReviewSummary) {
      return {
        message: "Để mình tổng hợp bình luận gần nhất của món này nha~",
        feActions: [],
        beActions: [
          {
            id: "be_review_summary_1",
            type: "GET_PRODUCT_REVIEWS_CONTEXT",
            payload: {
              productId,
              limit: 10,
              intent: "summarize_reviews",
            },
          },
        ],
      };
    }

    if (isProductDetailPage && wantsReviewComment) {
      return {
        message: "Để mình điền đánh giá giúp bạn nha~",
        feActions: [],
        beActions: [
          {
            id: "be_review_comment_1",
            type: "GET_PRODUCT_REVIEWS_CONTEXT",
            payload: {
              productId,
              limit: 10,
              intent: "submit_review",
            },
          },
        ],
      };
    }

    if (text.includes("trà sữa")) {
      return {
        message: "Để mình tìm trà sữa gần bạn nha",
        feActions: [
          {
            id: "fe_2",
            type: "CLEAR_CART",
          },
        ],
        beActions: [
          {
            id: "be_1",
            type: "FIND_PRODUCTS",
            payload: {
              keyword: "trà sữa",
            },
          },
        ],
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
              rank: 1,
            },
          },
          {
            id: "be_2",
            type: "FIND_ORDER_CONVERSATION",
            payload: {},
          },
        ],
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
              rank: 1,
            },
          },
          {
            id: "be_2",
            type: "FIND_ORDER_CONVERSATION",
          },
          {
            id: "be_3",
            type: "GET_RECENT_MESSAGES",
            payload: {
              limit: 3,
            },
          },
        ],
      };
    }

    if (text.includes("đọc") && text.includes("3 tin nhắn")) {
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
                limit: 3,
              },
            },
          ],
        };
      }

      return {
        message: "Mình chưa biết bạn muốn đọc tin nhắn nào nè~ hãy mở đúng đoạn chat trước nha.",
        feActions: [],
        beActions: [],
      };
    }

    return {
      message: "Mình chưa hiểu ý bạn nyaa~ 😢",
      feActions: [],
      beActions: [],
    };
  }

  async buildResponse(context: any) {
    if (context.reviewTarget?.product?._id) {
      const productId = context.reviewTarget.product._id;
      const productName = context.reviewTarget.product.name || "món này";
      const recentReviews = context.reviewTarget.recentReviews || [];

      if (context.reviewIntent === "summarize_reviews") {
        return {
          message:
            recentReviews.length > 0
              ? `${productName} được review gần đây là ngon.`
              : `${productName} chưa có nhiều review, nhưng fake AI vẫn thấy là ngon.`,
          actions: [],
        };
      }

      if (context.reviewIntent === "submit_review") {
        const needsNavigation = context.ui?.currentPage !== "product_detail";
        const actions: any[] = [];

        if (needsNavigation) {
          actions.push({
            type: "NAVIGATE",
            delay: 0,
            payload: {
              url: `/(stack)/product/${productId}`,
            },
          });
        }

        actions.push(
          {
            type: "SET_REVIEW_RATING",
            delay: needsNavigation ? 700 : 0,
            payload: {
              productId,
              rating: 5,
            },
          },
          {
            type: "SET_REVIEW_TEXT",
            delay: needsNavigation ? 1000 : 300,
            payload: {
              productId,
              text: "Món ăn rất ngon",
              reviewContext: context.reviewTarget.reviewPromptContext,
            },
          },
          {
            type: "SUBMIT_REVIEW",
            delay: needsNavigation ? 1400 : 700,
            payload: {
              productId,
            },
          }
        );

        return {
          message: `Mình đã chuẩn bị review 5 sao cho ${productName} rồi nè~`,
          actions,
        };
      }
    }

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
            },
          },
          {
            type: "READ_CHAT_MESSAGES",
            delay: 900,
            payload: {
              conversationId: context.conversation._id.toString(),
              text: textToRead,
            },
          },
        ],
      };
    }

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
            },
          },
          {
            type: "SET_CHAT_INPUT",
            delay: 500,
            payload: {
              conversationId: context.conversation._id.toString(),
              text: "chào bạn ,tôi là đệ",
            },
          },
          {
            type: "SUBMIT_CHAT_MESSAGE",
            delay: 1200,
            payload: {
              conversationId: context.conversation._id.toString(),
            },
          },
        ],
      };
    }

    const item = context.product?.[0];
    if (!item) {
      return {
        message: "Không tìm thấy dữ liệu phù hợp nyaa 😭",
        actions: [],
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
            image: product.image || "",
          },
        },
        {
          type: "NAVIGATE",
          delay: 300,
          payload: { url: "/cart" },
        },
        {
          type: "NAVIGATE",
          delay: 500,
          payload: { url: "/(stack)/checkout" },
        },
        {
          type: "SET_CHECKOUT_INFO",
          delay: 900,
          payload: {
            receiverName: "Hoàng Đệ",
            receiverPhone: "0909123456",
          },
        },
        {
          type: "SUBMIT_ORDER",
          delay: 1400,
          payload: {},
        },
        {
          type: "NAVIGATE",
          delay: 2200,
          payload: {
            url: "/(tabs)/order",
            isRefresh: true,
          },
        },
      ],
      requiresInput: false,
    };
  }
}
