import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { Public, ResponseMessage } from 'src/decorator/customize';
import { MailerService } from '@nestjs-modules/mailer';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { User, UserDocument } from 'src/users/schemas/user.schema';
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService,
    private mailerService: MailerService,
    @InjectModel(User.name)
    private userModel: SoftDeleteModel<UserDocument>,

  ) {
  }
  @Post()
  @Public()
  @ResponseMessage("Test email")
  async handleTestEmail(@Body() body: { email: string }) {
    const { email } = body;
    // 1. Giả sử user test (sau này bạn lấy từ body hoặc token)
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    // 2. Sinh OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Tạo thời hạn 5 phút
    const expired = new Date();
    expired.setMinutes(expired.getMinutes() + 5);

    // 4. Lưu vào DB
    user.OTP = otp;
    user.OTPExpired = expired;
    await user.save();

    // 5. Gửi mail bằng handlebars template
    await this.mailerService.sendMail({
      to: email,
      subject: `Mã OTP xác minh - Food Shop`,
      template: './otp',
      context: {
        appName: 'Food Shop',      // hoặc lấy từ config
        email,
        otp,                       // "123456"
        expired: expired.toLocaleTimeString('vi-VN'),
        supportEmail: 'support@foodshop.com',
        year: new Date().getFullYear(),
      },
    });
    return {
      message: "OTP đã được gửi vào email",
      expiredAt: expired,
    };
  }
}
