import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EntrySource } from '@prisma/client';
import {
  FarmContextGuard,
  type RequestWithFarmContext,
} from '../auth/farm-context.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateRevenueDto } from './dto/create-revenue.dto';
import { FinancialPeriodDto } from './dto/financial-period.dto';
import { ListFinancialEntriesDto } from './dto/list-financial-entries.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { UpdateRevenueDto } from './dto/update-revenue.dto';
import { FinancialService } from './financial.service';

@UseGuards(FarmContextGuard)
@Controller('financial')
export class FinancialController {
  constructor(private readonly financial: FinancialService) {}

  @Get('entries')
  entries(
    @Req() request: RequestWithFarmContext,
    @Query() query: ListFinancialEntriesDto,
  ) {
    return this.financial.listFinancialEntries(request.farmId!, query);
  }

  @Get('summary')
  summary(
    @Req() request: RequestWithFarmContext,
    @Query() query: FinancialPeriodDto,
  ) {
    return this.financial.getFinancialSummary(request.farmId!, query);
  }

  @Get('areas')
  areas(@Req() request: RequestWithFarmContext) {
    return this.financial.listAreas(request.farmId!);
  }

  @Post('expenses')
  createExpense(
    @Req() request: RequestWithFarmContext,
    @Body() body: CreateExpenseDto,
  ) {
    return this.financial.createExpense(request.farmId!, {
      ...body,
      source: EntrySource.MANUAL,
    });
  }

  @Patch('expenses/:id')
  updateExpense(
    @Req() request: RequestWithFarmContext,
    @Param('id') id: string,
    @Body() body: UpdateExpenseDto,
  ) {
    return this.financial.updateExpense(request.farmId!, {
      ...body,
      id,
      source: EntrySource.MANUAL,
    });
  }

  @Delete('expenses/:id')
  @HttpCode(204)
  deleteExpense(
    @Req() request: RequestWithFarmContext,
    @Param('id') id: string,
  ) {
    return this.financial.deleteExpense(request.farmId!, id);
  }

  @Post('revenues')
  createRevenue(
    @Req() request: RequestWithFarmContext,
    @Body() body: CreateRevenueDto,
  ) {
    return this.financial.createRevenue(request.farmId!, {
      ...body,
      source: EntrySource.MANUAL,
    });
  }

  @Patch('revenues/:id')
  updateRevenue(
    @Req() request: RequestWithFarmContext,
    @Param('id') id: string,
    @Body() body: UpdateRevenueDto,
  ) {
    return this.financial.updateRevenue(request.farmId!, {
      ...body,
      id,
      source: EntrySource.MANUAL,
    });
  }

  @Delete('revenues/:id')
  @HttpCode(204)
  deleteRevenue(
    @Req() request: RequestWithFarmContext,
    @Param('id') id: string,
  ) {
    return this.financial.deleteRevenue(request.farmId!, id);
  }
}
