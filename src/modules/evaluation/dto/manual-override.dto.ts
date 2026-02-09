import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class ManualOverrideDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  teacherScore?: number;

  @IsString()
  @IsOptional()
  teacherComments?: string;
}
