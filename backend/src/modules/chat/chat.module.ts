import { Module } from '@nestjs/common';
import { CattleModule } from '../cattle/cattle.module';
import { FinancialModule } from '../financial/financial.module';
import { FarmModule } from '../farm/farm.module';
import { ChatController } from './chat.controller';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';

@Module({
  imports: [FinancialModule, FarmModule, CattleModule],
  controllers: [ChatController],
  providers: [ChatRepository, ChatService],
})
export class ChatModule {}
