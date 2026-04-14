import { Injectable } from "@nestjs/common";

@Injectable()
export class MemoryService {
    async getRecentMessages(page: string) {
        return [
            {
                role: "system",
                content: `User đang ở trang ${page}`
            }
        ];
    }

    async saveConversation(state: any) {
        // lưu MongoDB (VoiceMessage)
    }
}