import { IsDateString, IsString, MinLength } from 'class-validator';

export class PlaceCattleLotDto {
  @IsString()
  @MinLength(1)
  paddockId!: string;

  @IsDateString()
  startedAt!: string;
}
