import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/users/users.role.enum';


export const RESPONSE_MESSAGE = 'response_message';
export const ResponseMessage = (message: string) =>
    SetMetadata(RESPONSE_MESSAGE, message);

export const User = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);

//Auth
export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';
export const IS_AUTH_KEY = 'isAuth';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Shortcut decorators
export const Admin = () => Roles(UserRole.ADMIN);
export const Seller = () => Roles(UserRole.SELLER);
export const Customer = () => Roles(UserRole.CUSTOMER);
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Auth = () => SetMetadata(IS_AUTH_KEY, true); // chỉ cần login