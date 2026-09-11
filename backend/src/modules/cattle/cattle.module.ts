import { Module } from '@nestjs/common';
import { OutboxModule } from '../outbox/outbox.module';
import { CattleController } from './cattle.controller';
import { CattleRepository } from './cattle.repository';
import { CattleService } from './cattle.service';

@Module({
  imports: [OutboxModule],
  controllers: [CattleController],
  providers: [CattleRepository, CattleService],
  exports: [CattleService],
})
export class CattleModule {}
