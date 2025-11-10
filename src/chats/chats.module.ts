import { Module } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatsGateway } from './chats.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schemas/message.schema';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { ChatsController } from './chats.controller';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { OpenAiModule } from 'src/open-ai/open-ai.module';

@Module({
  controllers: [ChatsController],
  providers: [ChatsGateway, ChatsService],
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: User.name, schema: UserSchema }
    ]),
    NotificationsModule,
    OpenAiModule
  ],
})
export class ChatsModule { }
