
import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IS_AUTH_KEY, IS_PUBLIC_KEY, ROLES_KEY } from 'src/decorator/customize';
import { UserRole } from 'src/users/users.role.enum';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {

    constructor(private reflector: Reflector) {
        super();
    }
    // canActivate(context: ExecutionContext) {
    //     const request = context.switchToHttp().getRequest();
    //     const user = request.user;

    //     // 1. Public -> ai cũng được
    //     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    //         context.getHandler(),
    //         context.getClass(),
    //     ]);
    //     if (isPublic) return true;

    //     // 2. Auth -> chỉ cần login
    //     const isAuth = this.reflector.getAllAndOverride<boolean>(IS_AUTH_KEY, [
    //         context.getHandler(),
    //         context.getClass(),
    //     ]);
    //     if (isAuth) return !!user;

    //     // 3. Roles cụ thể
    //     const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
    //         context.getHandler(),
    //         context.getClass(),
    //     ]);

    //     // API không có annotation gì -> mặc định chặn
    //     if (!requiredRoles) return false;

    //     // Nếu có roles thì phải check
    //     if (!user) return false;
    //     return requiredRoles.includes(user.role);
    // }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 1) Public -> bỏ qua xác thực
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        // 2) BẮT BUỘC: chạy Passport để populate req.user (trừ Public)
        const ok = (await super.canActivate(context)) as boolean;
        if (!ok) return false;

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // 3) Auth -> chỉ cần login (đến đây Passport đã verify xong)
        const isAuth = this.reflector.getAllAndOverride<boolean>(IS_AUTH_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isAuth) return true;

        // 4) Roles cụ thể
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Mặc định: KHÔNG có decorator gì -> chặn (nếu muốn "chỉ cần login" thì return true)
        if (!requiredRoles) return false;

        return !!user && requiredRoles.includes(user.role);
    }
    handleRequest(err, user, info) {
        // You can throw an exception based on either "info" or "err" arguments
        if (err) {
            throw err || new UnauthorizedException("Token không hợp lệ");
        }
        return user;
    }
}