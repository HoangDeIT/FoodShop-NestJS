import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { MailModule } from './mail/mail.module';
import { FilesModule } from './files/files.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { LocationsModule } from './locations/locations.module';
import { LikesModule } from './likes/likes.module';
import { CartsModule } from './carts/carts.module';
import { OrdersModule } from './orders/orders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatsModule } from './chats/chats.module';
import { OpenAiModule } from './open-ai/open-ai.module';
import { SystemMonitorModule } from './system-monitor/system-monitor.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { VoiceAgentModule } from './voice-agent/voice-agent.module';
@Module({
  imports: [AuthModule, UsersModule, MailModule, FilesModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URL'),
        connectionFactory: (connection) => {
          connection.plugin(softDeletePlugin);
          return connection;
        }
      }),

      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ProductsModule,
    CategoriesModule,
    LocationsModule,
    LikesModule,
    CartsModule,
    OrdersModule,
    ReviewsModule,
    NotificationsModule,
    ChatsModule,
    OpenAiModule,
    SystemMonitorModule,
    DashboardModule,
    VoiceAgentModule,
  ],
  controllers: [AppController],
  providers: [AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule { }
