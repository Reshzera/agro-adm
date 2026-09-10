import { IsNotEmpty, IsString } from 'class-validator';

export class FindFarmParamsDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
