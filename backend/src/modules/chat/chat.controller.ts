import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { pipeUIMessageStreamToResponse } from 'ai';
import type { Response } from 'express';
import {
  FarmContextGuard,
  type RequestWithFarmContext,
} from '../auth/farm-context.guard';
import { ChatService } from './chat.service';
import { PostChatDto } from './dto/post-chat.dto';

@UseGuards(FarmContextGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get(':id')
  history(@Param('id') id: string, @Req() request: RequestWithFarmContext) {
    return this.chat.history(request.farmId!, id);
  }

  @Post()
  @HttpCode(200)
  async stream(
    @Body() body: PostChatDto,
    @Req() request: RequestWithFarmContext,
    @Res() response: Response,
  ): Promise<void> {
    const stream = await this.chat.stream(request.farmId!, body);
    await pipeUIMessageStreamToResponse({ response, stream });
  }
}
