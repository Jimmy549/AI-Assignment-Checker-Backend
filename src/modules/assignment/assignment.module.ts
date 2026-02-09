import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { User } from '../auth/entities/user.entity';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
import { EvaluationModule } from '../evaluation/evaluation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, User]),
    forwardRef(() => EvaluationModule),
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}