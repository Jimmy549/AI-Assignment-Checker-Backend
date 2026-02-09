import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationResult } from './entities/evaluation-result.entity';
import { EvaluationService } from './evaluation.service';
import { AiEvaluationService } from './services/ai-evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { AssignmentModule } from '../assignment/assignment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EvaluationResult]),
    forwardRef(() => AssignmentModule),
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService, AiEvaluationService],
  exports: [EvaluationService, AiEvaluationService],
})
export class EvaluationModule {}