import { IsBoolean, IsOptional } from 'class-validator';
import { CreatePaddockDto } from './create-paddock.dto';

export class UpdatePaddockDto extends CreatePaddockDto {
  @IsOptional()
  declare name: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
