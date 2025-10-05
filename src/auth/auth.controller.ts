import { BadRequestException, Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Admin, Auth, Public, ResponseMessage, User } from 'src/decorator/customize';
import { LocalAuthGuard } from './local-auth.guard';
import { IUser } from 'src/users/users.interface';
import { MailService } from 'src/mail/mail.service';
import { UsersService } from 'src/users/users.service';
import { UserRole, UserStatus } from 'src/users/users.role.enum';
import { RegisterDTO } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly mailService: MailService,
    private usersService: UsersService
  ) {
  }
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  @ResponseMessage("User Login")
  handleLogin(@Req() req,
    @Res({ passthrough: true }) response: Response) {
    return this.authService.login(req.user, response);
  }
  @Auth()
  @Get("/get-profile")
  handleGetProfile(@User() user: IUser) {
    return user;
  }
  @Post("/verify-otp")
  @Public()
  async verifyOtp(@Body() body: { email: string; otp: string }) {


    return this.authService.verifyOtp(body.email, body.otp);
  }
  @Post("/forget-password")
  @Public()
  async forgetPassword(@Body() body: { email: string }) {
    return await this.mailService.sendMail(body.email, "forgot-password");
  }
  @Post("/reset-password")
  @Public()
  async resetPassword(@Body() body: { email: string; otp: string; newPassword: string }) {
    const { email, otp, newPassword } = body;
    const user = await this.authService.verifyOtp(email, otp);
    user.password = this.usersService.getHashPassword(newPassword);
    await user.save();
    return user;
  }
  @Public()
  @Post("/register")
  async handleRegister(@Body() body: RegisterDTO) {
    const { name, email, password, role } = body;

    const status = UserStatus.INACTIVE;
    if (role === UserRole.ADMIN) {
      throw new BadRequestException("Cannot register with admin role");
    }
    const isExist = await this.usersService.findOneByUsername(email);
    if (isExist) throw new BadRequestException("Email already exists");

    const createUserDto = { name, email, password, role: role, status, avatar: "", address: "" };
    const user = await this.usersService.create(createUserDto);

    await this.mailService.sendMail(email, "activate");
    return user;
  }
  @Post("/valid-user")
  @Public()
  async activate(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    const user = await this.authService.validateUser(email, password, true);
    if (!user) {
      throw new UnauthorizedException("Username/password không hợp lệ!");
    }
    return user;
  }
}
