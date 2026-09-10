import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;
}
