import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { ExpoNotifyService } from 'src/notifications/expo-notify.service';
import { ChatsGateway } from './chats.gateway';
import { User, UserDocument } from 'src/users/schemas/user.schema';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(Message.name)
    private messageModel: SoftDeleteModel<MessageDocument>,
    @InjectModel(Conversation.name)
    private conversationModel: SoftDeleteModel<ConversationDocument>,
    @InjectModel(User.name)
    private userModel: SoftDeleteModel<UserDocument>,
    private readonly expoNotifyService: ExpoNotifyService,

  ) { }

  // 🧩 Gửi tin nhắn mới
  async createMessage(data: {
    conversationId: string;
    senderId: string;
    type: 'text' | 'product' | 'store' | 'ai_text' | 'image';
    data: string | {
      intent: string;
      message: string;
      data?: any,

    };
  }) {
    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(data.conversationId),
      senderId: new Types.ObjectId(data.senderId),
      type: data.type,
      data: data.data,
      createdAt: new Date(),
    });

    // Cập nhật lastMessage
    await this.conversationModel.findByIdAndUpdate(data.conversationId, {
      lastMessage: {
        type: data.type,
        data: data.data,
        senderId: new Types.ObjectId(data.senderId),
        createdAt: new Date(),
      },
      updatedAt: new Date(),
    });

    return await message.populate('senderId', 'name avatar');
  }

  // 🧾 Lấy danh sách tin nhắn
  async getMessages(conversationId: string) {
    return await this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .populate("senderId", "name avatar isOnline")
      .populate({
        path: "conversationId",                      // ✅ populate conversation
        populate: {
          path: "participants",                      // ✅ populate participants trong conversation
          select: "name avatar isOnline",            // chỉ lấy các trường cần thiết
        },
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  // 🗂️ Lấy danh sách conversation của user
  async getUserConversations(userId: string) {
    return await this.conversationModel
      .find({ participants: { $in: [userId] } })
      .populate('participants', 'name avatar isOnline') // 👈 thêm isOnline
      .sort({ updatedAt: -1 })
      .exec();
  }

  // ➕ Tạo conversation mới
  async createConversation(userA: string, userB: string) {
    const exist = await this.conversationModel.findOne({
      participants: { $all: [userA, userB] },
    });
    if (exist) return exist;

    return await this.conversationModel.create({
      participants: [userA, userB],
      createdAt: new Date(),
    });
  }
  async markMessagesAsRead(conversationId: string, userId: string) {
    await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(userId) },
        isRead: false,
      },
      { $set: { isRead: true } }
    );
  }
  async notifyIfOffline(payload: {
    conversationId: string;
    senderId: string;
    data: string;
  }) {
    const conversation = await this.conversationModel
      .findById(payload.conversationId)
      .populate("participants", "name avatar expoPushToken isOnline");

    if (!conversation) return;

    const recipients = (conversation.participants as any[]).filter(
      (p) => p._id.toString() !== payload.senderId,
    );

    for (const recipient of recipients) {
      if (recipient.isOnline) {
        console.log(`💚 ${recipient.name} đang online — không gửi notification`);
        continue;
      }

      if (!recipient.expoPushToken) {
        console.log(`🖥️ ${recipient.name} không có Expo token`);
        continue;
      }

      await this.expoNotifyService.sendNotification(
        recipient.expoPushToken,
        "Tin nhắn mới 💬",
        payload.data,
        { conversationId: payload.conversationId },
      );
    }
  }

}
