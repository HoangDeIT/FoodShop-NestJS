import { IsNotEmpty, IsString } from 'class-validator';


export class AddReplyDto {
    @IsString()
    @IsNotEmpty({ message: 'Nội dung phản hồi không được để trống' })
    comment: string;
}
