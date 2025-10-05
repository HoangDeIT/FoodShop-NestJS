import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { UserRole, UserStatus } from '../users.role.enum';
export class CreateUserDto {
    @IsNotEmpty()
    name: string;
    @IsNotEmpty()
    @IsEmail()
    email: string;
    @IsNotEmpty()
    password: string;
    @IsOptional()
    address: string;
    @IsEnum(UserRole, { message: 'role must be admin | seller | customer' })
    role: UserRole;
    @IsEnum(UserStatus, { message: 'status must be active | inactive' })
    status: UserStatus;
    @IsOptional()
    avatar: string;
}
