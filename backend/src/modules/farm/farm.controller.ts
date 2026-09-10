import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import {
  FarmContextGuard,
  type RequestWithFarmContext,
} from '../auth/farm-context.guard';
import { FindFarmParamsDto } from './dto/find-farm-params.dto';
import { FarmService } from './farm.service';

@UseGuards(FarmContextGuard)
@Controller('farms')
export class FarmController {
  constructor(private readonly farm: FarmService) {}

  @Get(':id')
  async get(
    @Param() params: FindFarmParamsDto,
    @Req() request: RequestWithFarmContext,
  ) {
    return this.farm.getForOwner(params.id, request.user!.id);
  }
}
