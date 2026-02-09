import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Assignment } from '../modules/assignment/entities/assignment.entity';
import { Submission } from '../modules/submission/entities/submission.entity';
import { EvaluationResult } from '../modules/evaluation/entities/evaluation-result.entity';
import { User } from '../modules/auth/entities/user.entity';
import { Student } from '../modules/student/entities/student.entity';

export const DatabaseConfig: TypeOrmModuleOptions = {
  type: 'mongodb',
  url: process.env.MONGO_URI,
  entities: [User, Assignment, Submission, EvaluationResult, Student],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
};