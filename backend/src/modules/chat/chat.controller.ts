import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
import { RenameChatDto } from './dto/rename-chat.dto';

@UseGuards(FarmContextGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(@Req() request: RequestWithFarmContext) {
    return this.chat.list(request.farmId!);
  }

  @Post('new')
  create(@Req() request: RequestWithFarmContext) {
    return this.chat.create(request.farmId!);
  }

  @Patch(':id')
  @HttpCode(204)
  async rename(
    @Param('id') id: string,
    @Body() body: RenameChatDto,
    @Req() request: RequestWithFarmContext,
  ) {
    await this.chat.rename(request.farmId!, id, body.title);
  }

  @Delete(':id')
  @HttpCode(204)
  async archive(
    @Param('id') id: string,
    @Req() request: RequestWithFarmContext,
  ) {
    await this.chat.archive(request.farmId!, id);
  }

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
