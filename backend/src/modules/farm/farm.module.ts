import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FarmController } from './farm.controller';
import { FarmRepository } from './farm.repository';
import { FarmService } from './farm.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FarmController],
  providers: [FarmRepository, FarmService],
})
export class FarmModule {}
