import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  rollNumber: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  class?: string;

  @IsString()
  @IsOptional()
  section?: string;
}
