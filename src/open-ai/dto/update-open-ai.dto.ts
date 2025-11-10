import { PartialType } from '@nestjs/mapped-types';
import { CreateOpenAiDto } from './create-open-ai.dto';

export class UpdateOpenAiDto extends PartialType(CreateOpenAiDto) {}
