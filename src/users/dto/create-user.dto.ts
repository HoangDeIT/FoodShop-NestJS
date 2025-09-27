import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../users.role.enum';
export class CreateUserDto {
    @IsNotEmpty()
    name: string;
    @IsNotEmpty()
    @IsEmail()
    email: string;
    @IsNotEmpty()
    password: string;
    address: string;
    @IsEnum(UserRole, { message: 'role must be admin | seller | customer' })
    role: UserRole;
}
