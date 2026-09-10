import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  id!: string;

  @IsIn(['user'])
  role!: 'user';

  @IsArray()
  @ArrayMinSize(1)
  @IsObject({ each: true })
  parts!: Record<string, unknown>[];
}

export class PostChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  id!: string;

  @ValidateNested()
  @Type(() => ChatMessageDto)
  message!: ChatMessageDto;
}
