import {
  Entity,
  Column,
  CreateDateColumn,
  ObjectIdColumn,
  ObjectId,
} from 'typeorm';
import { Submission } from '../../submission/entities/submission.entity';

@Entity('evaluation_results')
export class EvaluationResult {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  id: string;

  @Column()
  submissionId: string;

  @Column({ type: 'float' })
  aiScore: number; // Original AI score

  @Column({ type: 'float', nullable: true })
  teacherScore: number; // Manual override score

  @Column({ type: 'float' })
  score: number; // Final score (teacherScore || aiScore)

  @Column({ type: 'float', nullable: true })
  percentageScore: number;

  @Column('text', { nullable: true })
  remarks: string;

  @Column('text', { nullable: true })
  teacherComments: string;

  @Column({ nullable: true })
  reviewedBy: string; // Teacher ID who reviewed

  @Column({ nullable: true })
  reviewedAt: Date;

  @Column({ default: false })
  isManuallyReviewed: boolean;

  @Column({ type: 'int', default: 1 })
  version: number; // Track evaluation attempts

  @Column('simple-json', { nullable: true })
  detailedFeedback: {
    topicRelevance: string;
    topicScore: number;
    structure: string;
    structureScore: number;
    contentQuality: string;
    contentScore: number;
    grammar: string;
    grammarScore: number;
    wordCount: number;
    lengthScore: number;
    recommendation: string;
  };

  @CreateDateColumn()
  evaluatedAt: Date;

  @Column({ default: false })
  passed: boolean;

  submission?: Submission;
}