import { AttentionItemStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListAttentionItemsDto {
  @IsOptional()
  @IsEnum(AttentionItemStatus)
  status?: AttentionItemStatus;
}
