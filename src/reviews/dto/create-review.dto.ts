import { IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, IsArray, ArrayMaxSize } from 'class-validator';


export class CreateReviewDto {
    @IsMongoId({ message: 'product phải là ObjectId hợp lệ' })
    @IsNotEmpty()
    product: string;

    @IsNumber()
    @Min(1, { message: 'Số sao tối thiểu là 1' })
    @Max(5, { message: 'Số sao tối đa là 5' })
    rating: number;

    @IsString()
    @IsNotEmpty()
    comment: string;

    @IsArray()
    @IsOptional()
    @ArrayMaxSize(5, { message: 'Không thể upload quá 5 ảnh' })
    @IsString({ each: true })
    images?: string[];
}
