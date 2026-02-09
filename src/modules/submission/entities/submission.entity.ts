import {
  Entity,
  Column,
  CreateDateColumn,
  ObjectIdColumn,
  ObjectId,
} from 'typeorm';
import { Assignment } from '../../assignment/entities/assignment.entity';
import { EvaluationResult } from '../../evaluation/entities/evaluation-result.entity';

@Entity('submissions')
export class Submission {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  id: string;

  @Column()
  studentName: string;

  @Column()
  studentRollNumber: string;

  @Column('text')
  fileContent: string;

  @Column({ nullable: true })
  fileName: string;

  @Column()
  assignmentId: string;

  @Column({ nullable: true })
  studentId: string;

  @Column({ default: 'pending' })
  submissionStatus: string; // 'pending', 'evaluated', 'reviewed'

  @CreateDateColumn()
  uploadedAt: Date;

  @Column({ default: false })
  isEvaluated: boolean;

  assignment?: Assignment;
  evaluation?: EvaluationResult;
}