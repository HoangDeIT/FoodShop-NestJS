import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { Auth, User } from 'src/decorator/customize';

@Controller('chats')
export class ChatsController {
    constructor(private readonly chatsService: ChatsService) { }

    // Tạo conversation (nếu chưa có)
    @Auth()
    @Post('create')
    async createConversation(
        @Body() body: { user: string },
        @User() user
    ) {
        return this.chatsService.createConversation(user._id, body.user);
    }

    // Lấy danh sách conversation của user
    @Get('conversations')
    @Auth()
    async getUserConversations(@User() user) {
        return this.chatsService.getUserConversations(user._id);
    }

    // Lấy toàn bộ message của conversation
    @Get('messages/:conversationId')
    @Auth()
    async getMessages(@Param('conversationId') id: string) {
        const res = await this.chatsService.getMessages(id);
        return res;
    }
}
