import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../assignment/entities/assignment.entity';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment])],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}