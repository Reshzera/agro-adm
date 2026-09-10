import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FinancialRepository } from './financial.repository';
import { FinancialService } from './financial.service';

@Module({
  imports: [DatabaseModule],
  providers: [FinancialRepository, FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {}
