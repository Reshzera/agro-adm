import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import {
  FarmContextGuard,
  type RequestWithFarmContext,
} from '../auth/farm-context.guard';
import { InvalidProfileUpdateError } from './errors/invalid-profile-update.error';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@UseGuards(FarmContextGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@Req() request: RequestWithFarmContext) {
    return this.profile.get(request.user!.id);
  }

  @Patch()
  update(
    @Req() request: RequestWithFarmContext,
    @Body() body: UpdateProfileDto,
  ) {
    if (
      body.name === undefined &&
      body.email === undefined &&
      body.phone === undefined
    ) {
      throw new InvalidProfileUpdateError();
    }
    return this.profile.update(request.user!.id, body);
  }
}
