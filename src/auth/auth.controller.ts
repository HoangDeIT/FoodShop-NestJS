import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Admin, Auth, Public, ResponseMessage, User } from 'src/decorator/customize';
import { LocalAuthGuard } from './local-auth.guard';
import { IUser } from 'src/users/users.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {
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
  @Public()
  @Post("/login/social-network/web")
  handleLoginSocialNetworkWeb() {
    return "login social network web";
  }
  @Public()
  @Post("/login/social-network/mobile")
  handleLoginSocialNetworkMobile() {
    return "login social network mobile";
  }
  @Public()
  @Post("/register")
  handleRegister() {
    return "register";
  }
}
