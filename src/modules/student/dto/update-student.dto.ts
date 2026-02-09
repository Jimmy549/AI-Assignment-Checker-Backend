import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  rollNumber?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  class?: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
