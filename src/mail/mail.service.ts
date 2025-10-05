import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { User, UserDocument } from 'src/users/schemas/user.schema';

@Injectable()
export class MailService {
    constructor(
        private mailerService: MailerService,
        @InjectModel(User.name)
        private userModel: SoftDeleteModel<UserDocument>,

    ) {
    }
    async sendMail(email: string, type: "activate" | "forgot-password") {
        const user = await this.userModel.findOne({ email });
        if (!user) throw new BadRequestException("User not found");

        // Sinh OTP + expired (dùng chung)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expired = new Date();
        expired.setMinutes(expired.getMinutes() + 5);

        user.OTP = otp;
        user.OTPExpired = expired;
        await user.save();

        const mailConfig: Record<string, any> = {
            "activate": {
                subject: "Kích hoạt tài khoản - Food Shop",
                headerTitle: "Xác minh tài khoản",
                primaryColor: "#22c55e",
                borderColor: "#16a34a",
                message: `Dùng mã này để kích hoạt tài khoản. Mã hết hạn lúc ${expired.toLocaleTimeString('vi-VN')} (5 phút).`,
            },
            "forgot-password": {
                subject: "Đặt lại mật khẩu - Food Shop",
                headerTitle: "Quên mật khẩu",
                primaryColor: "#f97316",
                borderColor: "#ea580c",
                message: `Dùng mã này để đặt lại mật khẩu. Mã hết hạn lúc ${expired.toLocaleTimeString('vi-VN')} (5 phút).`,
            }
        };

        const config = mailConfig[type];

        await this.mailerService.sendMail({
            to: email,
            subject: config.subject,
            template: './otp',
            context: {
                appName: 'Food Shop',
                email,
                headerTitle: config.headerTitle,
                primaryColor: config.primaryColor,
                borderColor: config.borderColor,
                otp,
                message: config.message,
                supportEmail: 'support@foodshop.com',
                year: new Date().getFullYear(),
                expired: expired.toLocaleTimeString('vi-VN'),
            }
        });

        return {
            message: `${type} mail sent successfully`,
            expiredAt: expired
        };
    }
}
