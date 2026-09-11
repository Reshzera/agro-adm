import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  FarmContextGuard,
  type RequestWithFarmContext,
} from '../auth/farm-context.guard';
import { CattleService } from './cattle.service';
import { CreateCattleLotDto } from './dto/create-cattle-lot.dto';
import { CreatePaddockDto } from './dto/create-paddock.dto';
import { PlaceCattleLotDto } from './dto/place-cattle-lot.dto';
import { UpdateCattleLotDto } from './dto/update-cattle-lot.dto';
import { UpdatePaddockDto } from './dto/update-paddock.dto';

@UseGuards(FarmContextGuard)
@Controller('cattle')
export class CattleController {
  constructor(private readonly cattle: CattleService) {}

  @Get('lots')
  listLots(@Req() request: RequestWithFarmContext) {
    return this.cattle.listLots(request.farmId!);
  }

  @Post('lots')
  createLot(
    @Req() request: RequestWithFarmContext,
    @Body() body: CreateCattleLotDto,
  ) {
    return this.cattle.createLot(request.farmId!, body);
  }

  @Patch('lots/:id')
  updateLot(
    @Req() request: RequestWithFarmContext,
    @Param('id') id: string,
    @Body() body: UpdateCattleLotDto,
  ) {
    return this.cattle.updateLot(request.farmId!, id, body);
  }

  @Post('lots/:id/initial-placement')
  placeLot(
    @Req() request: RequestWithFarmContext,
    @Param('id') id: string,
    @Body() body: PlaceCattleLotDto,
  ) {
    return this.cattle.placeLot(
      request.farmId!,
      id,
      body.paddockId,
      body.startedAt,
    );
  }

  @Get('paddocks')
  listPaddocks(@Req() request: RequestWithFarmContext) {
    return this.cattle.listPaddocks(request.farmId!);
  }

  @Post('paddocks')
  createPaddock(
    @Req() request: RequestWithFarmContext,
    @Body() body: CreatePaddockDto,
  ) {
    return this.cattle.createPaddock(request.farmId!, body);
  }

  @Patch('paddocks/:id')
  updatePaddock(
    @Req() request: RequestWithFarmContext,
    @Param('id') id: string,
    @Body() body: UpdatePaddockDto,
  ) {
    return this.cattle.updatePaddock(request.farmId!, id, body);
  }
}
