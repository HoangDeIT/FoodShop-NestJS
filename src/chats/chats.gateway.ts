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

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatsService: ChatsService,
    @InjectModel(User.name)
    private userModel: SoftDeleteModel<UserDocument>,
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
    const user = await this.userModel.findById(userId, "isOnline").lean();
    return !!user?.isOnline;
  }

  // 💬 Khi user đang nhập
  @SubscribeMessage("user_typing")
  handleTyping(
    @MessageBody() payload: { conversationId: string; userId: string; userName: string },
  ) {
    this.server.to(payload.conversationId).emit("user_typing", payload);
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

}
