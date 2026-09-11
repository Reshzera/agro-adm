import { Module } from '@nestjs/common';
import { RuleEngineModule } from '../rule-engine/rule-engine.module';
import { OutboxProcessor } from './outbox.processor';
import { OutboxRepository } from './outbox.repository';

@Module({
  imports: [RuleEngineModule],
  providers: [OutboxRepository, OutboxProcessor],
  exports: [OutboxProcessor],
})
export class OutboxModule {}
