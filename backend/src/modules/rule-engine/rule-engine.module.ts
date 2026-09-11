import { Module } from '@nestjs/common';
import { AttentionModule } from '../attention/attention.module';
import { RuleEngineRepository } from './rule-engine.repository';
import { RuleEngineService } from './rule-engine.service';

@Module({
  imports: [AttentionModule],
  providers: [RuleEngineRepository, RuleEngineService],
  exports: [RuleEngineService],
})
export class RuleEngineModule {}
