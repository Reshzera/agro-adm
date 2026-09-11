import { Module } from '@nestjs/common';
import { AttentionController } from './attention.controller';
import { AttentionRepository } from './attention.repository';
import { AttentionService } from './attention.service';

@Module({
  controllers: [AttentionController],
  providers: [AttentionRepository, AttentionService],
  exports: [AttentionService],
})
export class AttentionModule {}
