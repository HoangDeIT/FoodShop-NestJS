import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from 'src/users/users.role.enum';
export class RegisterDTO {
    @IsNotEmpty()
    name: string;
    @IsNotEmpty()
    @IsEmail()
    email: string;
    @IsNotEmpty()
    password: string;
    @IsNotEmpty()
    @IsEnum(UserRole, { message: 'role must be admin | seller | customer' })
    role: UserRole;
}
