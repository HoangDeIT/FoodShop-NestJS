import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatsService } from './chats.service';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Interval } from '@nestjs/schedule';
import { config } from 'process';
import { ConfigService } from '@nestjs/config';
import { AiOrchestratorService } from 'src/open-ai/ai-orchestrator.service';
import { UsersService } from 'src/users/users.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatsService: ChatsService,
    @InjectModel(User.name)
    private userModel: SoftDeleteModel<UserDocument>,
    private usersService: UsersService,
    private configService: ConfigService,
    private readonly aiOrchestratorService: AiOrchestratorService
  ) { }


  private lastPing = new Map<string, number>(); // userId -> timestamp

  @SubscribeMessage("heartbeat")
  handleHeartbeat(@MessageBody() data: { userId: string }) {
    this.lastPing.set(data.userId, Date.now());
    this.server.emit("user_online", { userId: data.userId, isOnline: true });
  }

  // 🧠 Mỗi 15s kiểm tra ai mất ping thì coi là offline
  @Interval(15000)
  checkHeartbeats() {
    const now = Date.now();
    for (const [userId, last] of this.lastPing.entries()) {
      if (now - last > 15000) {
        this.lastPing.delete(userId);
        this.server.emit("user_online", { userId, isOnline: false });
        console.log(`❌ ${userId} timeout - set offline`);
      }
    }
  }

  // Khi user connect
  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) return;

    await this.userModel.findByIdAndUpdate(userId, {
      isOnline: true,
      lastActive: new Date(),
    });
    this.lastPing.set(userId, Date.now());
    console.log(`✅ User ${userId} connected`);
    this.server.emit("user_online", { userId, isOnline: true });
    // ⚡ Gọi hàm auto tạo conversation với bot
    await this.ensureBotConversation(userId);
  }

  // Khi user disconnect
  async handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) return;
    this.lastPing.delete(userId);
    await this.userModel.findByIdAndUpdate(userId, {
      isOnline: false,
      lastActive: new Date(),
    });

    console.log(`❌ User ${userId} disconnected`);
    this.server.emit("user_online", {
      userId,
      isOnline: false,
      lastActive: new Date(),
    });
  }

  // 🟢 Client join vào conversation room
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody('conversationId') conversationId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.query.userId as string;
    client.join(conversationId);
    console.log(`Client ${client.id} joined room ${conversationId}`);
    if (userId) await this.updateLastActive(userId);
  }

  // 🟢 Gửi tin nhắn
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody()
    payload: {
      conversationId: string;
      senderId: string;
      type: 'text' | 'image';
      data: string;
    },
  ) {
    const message = await this.chatsService.createMessage(payload);
    this.server.to(payload.conversationId).emit('receive_message', message);
    await this.updateLastActive(payload.senderId);
    await this.chatsService.notifyIfOffline(payload);
    // 2️⃣ Nếu trong conversation có bot → gọi hàm xử lý riêng
    await this.handleBotReply(payload.conversationId, payload.data);
    return message;

  }
  // 🟢 Đánh dấu đã đọc
  @SubscribeMessage("mark_as_read")
  async handleMarkAsRead(
    @MessageBody() payload: { conversationId: string; userId: string }
  ) {
    await this.chatsService.markMessagesAsRead(payload.conversationId, payload.userId);
    await this.updateLastActive(payload.userId);

    // Báo cho người gửi
    this.server.to(payload.conversationId).emit("messages_read", payload);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const user = await this.usersService.findOne({ id: userId });
    return !!user?.profile?.isOnline;
  }

  // 💬 Khi user đang nhập
  @SubscribeMessage("user_typing")
  handleTyping(
    @MessageBody() payload: { conversationId: string; userId: string; userName: string },
    @ConnectedSocket() client: Socket,
  ) {
    // 👇 chỉ gửi tới những người khác trong room
    client.broadcast.to(payload.conversationId).emit("user_typing", payload);
  }

  // ✋ Khi user dừng nhập
  @SubscribeMessage("user_stopped_typing")
  handleStopTyping(
    @MessageBody() payload: { conversationId: string; userId: string },
  ) {
    this.server.to(payload.conversationId).emit("user_stopped_typing", payload);
  }
  private async updateLastActive(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      lastActive: new Date(),
      isOnline: true,
    }).exec();
  }
  ////Chatbot logic
  // ✅ Hàm tách riêng cho clean
  private async ensureBotConversation(userId: string) {
    const BOT_ID = this.configService.get<string>('BOT_ID')!;
    try {
      const user = await this.userModel.findById(userId).lean();
      if (!user || user.role !== 'customer') return;

      // 🔍 Gọi qua hàm service mới
      const convo = await this.chatsService.createConversation(userId, BOT_ID);

      // 💬 Nếu conversation mới (chưa có lastMessage) thì gửi lời chào
      if (!convo.lastMessage) {
        await this.chatsService.createMessage({
          conversationId: convo._id.toString(),
          senderId: BOT_ID,
          type: 'text',
          data: 'Xin chào  👋! Mình là Chatbot AI, có thể giúp gì cho bạn nè?',
        });
      }

      console.log(`🤖 Auto-created Chatbot conversation for user ${user.name}`);
    } catch (err) {
      console.error('❌ Lỗi tạo Chatbot conversation:', err);
    }
  }

  private async handleBotReply(conversationId: string, userMessage: string) {
    try {
      // 1️⃣ Lấy conversation để tìm bot
      const conversation = await this.chatsService['conversationModel']
        .findById(conversationId)
        .populate('participants', '_id name role');

      const bot = (conversation?.participants as any[]).find(
        (p) => p.role === 'bot' || p.name?.toLowerCase().includes('chatbot'),
      );
      if (!bot) return;

      // 2️⃣ Gọi AI orchestrator để xử lý
      const user = (conversation?.participants as any[]).find(
        (p) => p.role === 'customer',
      );
      if (!user) return;

      // 🧠 Gọi AI logic trung tâm (đã có detectIntent, normalize, v.v.)
      const aiResponse = await this.aiOrchestratorService.handleUserMessage(
        userMessage,
        user._id.toString(),
      );

      // 3️⃣ Tạo message AI lưu vào DB
      const aiMessage = await this.chatsService.createMessage({
        conversationId,
        senderId: bot._id.toString(), // bot gửi
        type: this.mapIntentToType(aiResponse.intent),
        data: {
          intent: aiResponse.intent,
          message: aiResponse.message,
          data: aiResponse.data?.result ?? aiResponse.data, // structured data (nếu có)
        },
      });

      // 4️⃣ Emit về client
      this.server.to(conversationId).emit('receive_message', aiMessage);

      console.log(`🤖 Bot replied [${aiResponse.intent}]: ${aiResponse.message}`);
    } catch (err) {
      console.error('❌ Bot reply error:', err);
    }
  }

  private mapIntentToType(intent: string): 'text' | 'product' | 'store' | 'ai_text' {
    switch (intent) {
      case 'find_product':
        return 'product';
      case 'find_store':
      case 'best_seller':
      case 'best_rating':
        return 'store';
      case 'order_status':
      case 'order_summary':
      default:
        return 'ai_text';
    }
  }

}
