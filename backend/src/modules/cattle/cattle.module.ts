import { Module } from '@nestjs/common';
import { CattleController } from './cattle.controller';
import { CattleRepository } from './cattle.repository';
import { CattleService } from './cattle.service';

@Module({
  controllers: [CattleController],
  providers: [CattleRepository, CattleService],
  exports: [CattleService],
})
export class CattleModule {}
