import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from './entities/submission.entity';
import { Assignment } from '../assignment/entities/assignment.entity';
import { EvaluationResult } from '../evaluation/entities/evaluation-result.entity';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { PdfService } from './services/pdf.service';
import { EvaluationModule } from '../evaluation/evaluation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Assignment, EvaluationResult]),
    EvaluationModule,
  ],
  controllers: [SubmissionController],
  providers: [SubmissionService, PdfService],
  exports: [SubmissionService],
})
export class SubmissionModule {}