import { IsString } from 'class-validator';

export class fileBodyDto {
  @IsString()
  userId: string;
}