import { Controller, Sse, Param, MessageEvent, Res } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { Customer, Seller, User } from 'src/decorator/customize';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  /** 🔹 Seller SSE stream */
  @Sse('seller/stream')
  @Seller()
  sellerStream(@User() user): Observable<MessageEvent> {
    // Lấy thông tin seller từ JWT (được SseAuthMiddleware gắn vào req.user)
    const sellerId = user._id || user.id;
    console.log('👤 Seller SSE connected:', sellerId);

    // Trả về stream SSE cho seller tương ứng
    return this.notificationsService.subscribeSeller(sellerId);
  }

  /** 🔹 Customer SSE stream (nếu bạn cần sau này) */
  @Sse('customer/stream')
  @Customer()
  customerStream(@User() user): Observable<MessageEvent> {
    const customerId = user._id!;
    console.log('👤 Customer SSE connected:', customerId);
    return this.notificationsService.subscribeCustomer(customerId);
  }
}
