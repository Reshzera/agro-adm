import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  FarmContextGuard,
  type RequestWithFarmContext,
} from '../auth/farm-context.guard';
import { FindFarmParamsDto } from './dto/find-farm-params.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';
import { InvalidFarmUpdateError } from './errors/invalid-farm-update.error';
import { FarmService } from './farm.service';

@UseGuards(FarmContextGuard)
@Controller('farms')
export class FarmController {
  constructor(private readonly farm: FarmService) {}

  @Get()
  async current(@Req() request: RequestWithFarmContext) {
    return this.farm.getForOwner(request.farmId!, request.user!.id);
  }

  @Patch()
  async updateCurrent(
    @Req() request: RequestWithFarmContext,
    @Body() body: UpdateFarmDto,
  ) {
    this.assertHasUpdate(body);
    return this.farm.updateForOwner(request.farmId!, request.user!.id, body);
  }

  @Get(':id')
  async get(
    @Param() params: FindFarmParamsDto,
    @Req() request: RequestWithFarmContext,
  ) {
    return this.farm.getForOwner(params.id, request.user!.id);
  }

  @Patch(':id')
  async update(
    @Param() params: FindFarmParamsDto,
    @Req() request: RequestWithFarmContext,
    @Body() body: UpdateFarmDto,
  ) {
    this.assertHasUpdate(body);
    return this.farm.updateForOwner(params.id, request.user!.id, body);
  }

  private assertHasUpdate(body: UpdateFarmDto): void {
    if (Object.values(body).every((value) => value === undefined)) {
      throw new InvalidFarmUpdateError();
    }
  }
}
