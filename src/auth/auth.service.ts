import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import e from 'express';
import { send } from 'process';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { MailService } from 'src/mail/mail.service';

import { User, UserDocument } from 'src/users/schemas/user.schema';
import { IUser } from 'src/users/users.interface';
import { UserStatus } from 'src/users/users.role.enum';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService,
        private jwtService: JwtService,
        private mailService: MailService
    ) { }
    async validateUser(username: string, pass: string, sendMail: boolean = false): Promise<any> {
        const user = await this.usersService.findOneByUsername(username);
        if (user) {
            const isValid = this.usersService.isValidPassword(pass, user.password);
            const isActive = user.status === UserStatus.ACTIVE;
            if (isValid === true && isActive === true) {

                return user;
            } if (isValid === true && isActive === false) {
                if (sendMail) await this.mailService.sendMail(user.email, "activate");
                throw new HttpException(
                    "Account not activated. Please verify your email.",
                    999, // 403
                );
            }
        }

        return null;
    }
    async login(user: IUser, response: Response) {
        const { _id, name, email, role } = user;
        const payload = {
            sub: "token login",
            iss: "from server",
            _id,
            name,
            email,
            role
        };
        return {
            access_token: this.jwtService.sign(payload),
            _id,
            name,
            email,
            role,
        };
    }
    async verifyOtp(email: string, otp: string, sendMail = true) {
        const user = await this.usersService.findOneByUsername(email);
        if (!user) throw new BadRequestException("User not found");

        if (user.OTP !== otp) throw new BadRequestException("OTP không hợp lệ");
        if (new Date() > user.OTPExpired) throw new BadRequestException("OTP đã hết hạn");
        user.status = UserStatus.ACTIVE;
        //     user.OTPExpired = new Date((new Date()).getTime() - 1000); // set OTP expired
        await user.save();
        return user;
    }
    //Check users (clone validateUser)
    // async checkUser(email: string, password: string) {
    //     const user = await this.usersService.findOneByUsername(email);
    //     if (user) {
    //         const isValid = this.usersService.isValidPassword(password, user.password);
    //         const isActive = user.status === UserStatus.ACTIVE;
    //         if (isValid === true && isActive === true) {
    //             // await this.mailService.sendMail(user.email, "activate");
    //             return user;
    //         } if (isValid === true && isActive === false) {
    //             this.mailService.sendMail(user.email, "activate");
    //             throw new HttpException(
    //                 "Account not activated. Please verify your email.",
    //                 999, // 403
    //             );
    //         }
    //     }

    //     return null;
    // }
}
