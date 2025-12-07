import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Seller, Admin, User } from 'src/decorator/customize';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  /**
   * 🧩 Dashboard cho ADMIN
   */
  @Admin()
  @Get('admin')
  async getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }

  /**
   * 🧩 Dashboard cho SELLER
   * @param seller (lấy từ decorator @Seller())
   */
  @Seller()
  @Get('seller')
  async getSellerDashboard(@User() seller: any) {
    return this.dashboardService.getSellerDashboard(seller._id);
  }
}
