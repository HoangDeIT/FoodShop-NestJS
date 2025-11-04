// src/notifications/expo-notify.service.ts
import { Injectable } from '@nestjs/common';
import { Expo } from 'expo-server-sdk';

@Injectable()
export class ExpoNotifyService {
    private expo = new Expo();

    /**
     * Gửi push notification tới 1 thiết bị
     * @param pushToken Expo push token của thiết bị (bắt đầu bằng ExponentPushToken[xxx])
     * @param title Tiêu đề thông báo
     * @param body Nội dung
     * @param data Dữ liệu kèm theo (tùy chọn)
     */
    async sendNotification(pushToken: string, title: string, body: string, data?: any) {
        if (!Expo.isExpoPushToken(pushToken)) {
            console.warn(`❌ Token không hợp lệ: ${pushToken}`);
            return;
        }

        const message = {
            to: pushToken,
            sound: 'default',
            title,
            body,
            data,
        };

        try {
            const tickets = await this.expo.sendPushNotificationsAsync([message]);
            console.log('🎫 Expo Tickets:', tickets);

        } catch (err) {
            console.error('❌ Lỗi gửi thông báo Expo:', err);
        }
    }
}
