import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { MarkingMode } from '../entities/assignment.entity';

export class CreateAssignmentDto {
  @IsString()
  title: string;

  @IsString()
  instructions: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minWords?: number;

  @IsEnum(MarkingMode)
  @IsOptional()
  markingMode?: MarkingMode;

  @IsNumber()
  @Min(1)
  @IsOptional()
  totalMarks?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  passPercentage?: number; // Must be between 0 and 1 (0% to 100%)
}