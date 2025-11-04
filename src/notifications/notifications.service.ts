import { Injectable } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class NotificationsService {
    private sellerStreams = new Map<string, Subject<MessageEvent>>();
    private customerStreams = new Map<string, Subject<MessageEvent>>();

    /** Helper tạo hoặc lấy stream */
    private getOrCreateStream(map: Map<string, Subject<MessageEvent>>, id: string): Subject<MessageEvent> {
        if (!map.has(id)) {
            map.set(id, new Subject<MessageEvent>());
        }
        return map.get(id)!; // 👈 thêm dấu “!” vì chắc chắn tồn tại
    }


    /** Seller */
    subscribeSeller(sellerId: string) {
        return this.getOrCreateStream(this.sellerStreams, sellerId).asObservable();
    }

    /** Customer */
    subscribeCustomer(customerId: string) {
        return this.getOrCreateStream(this.customerStreams, customerId).asObservable();
    }

    /** Gửi event cho seller */
    notifySeller(sellerId: string, data: any) {
        this.sellerStreams.get(sellerId)?.next({ data });
    }

    /** Gửi event cho customer */
    notifyCustomer(customerId: string, data: any) {
        this.customerStreams.get(customerId)?.next({ data });
    }

    /** Xoá stream khi ngắt kết nối */
    removeSeller(sellerId: string) {
        const stream = this.sellerStreams.get(sellerId);
        if (stream) {
            stream.complete();
            this.sellerStreams.delete(sellerId);
        }
    }
}
