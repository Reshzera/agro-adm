import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import {
  FarmContextGuard,
  type RequestWithFarmContext,
} from '../auth/farm-context.guard';
import { AttentionService } from './attention.service';
import { ListAttentionItemsDto } from './dto/list-attention-items.dto';

@UseGuards(FarmContextGuard)
@Controller('attention-items')
export class AttentionController {
  constructor(private readonly attention: AttentionService) {}

  @Get()
  list(
    @Req() request: RequestWithFarmContext,
    @Query() query: ListAttentionItemsDto,
  ) {
    return this.attention.list(request.farmId!, query.status);
  }

  @Get(':id/explanation')
  explain(@Req() request: RequestWithFarmContext, @Param('id') id: string) {
    return this.attention.explain(request.farmId!, id);
  }
}
