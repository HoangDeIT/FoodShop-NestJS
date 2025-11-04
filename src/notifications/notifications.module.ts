import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ExpoNotifyService } from './expo-notify.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, ExpoNotifyService],
  exports: [NotificationsService, ExpoNotifyService],
})
export class NotificationsModule { }
