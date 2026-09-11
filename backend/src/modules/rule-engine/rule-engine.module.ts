import { Module } from '@nestjs/common';
import { RuleEngineRepository } from './rule-engine.repository';
import { RuleEngineService } from './rule-engine.service';

@Module({
  providers: [RuleEngineRepository, RuleEngineService],
  exports: [RuleEngineService],
})
export class RuleEngineModule {}
