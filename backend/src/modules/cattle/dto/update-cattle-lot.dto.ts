import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCattleLotDto } from './create-cattle-lot.dto';

export class UpdateCattleLotDto extends CreateCattleLotDto {
  @IsOptional()
  declare name: string;

  @IsOptional()
  declare category: CreateCattleLotDto['category'];

  @IsOptional()
  declare headCount: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
