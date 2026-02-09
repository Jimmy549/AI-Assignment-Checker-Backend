import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ObjectIdColumn,
  ObjectId,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Submission } from '../../submission/entities/submission.entity';

export enum MarkingMode {
  STRICT = 'strict',
  LOOSE = 'loose',
}

@Entity('assignments')
export class Assignment {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  id: string;

  @Column()
  title: string;

  @Column('text')
  instructions: string;

  @Column({ type: 'int', default: 500 })
  minWords: number;

  @Column({ type: 'varchar', default: MarkingMode.STRICT })
  markingMode: MarkingMode;

  @Column({ type: 'int', default: 100 })
  totalMarks: number;

  @Column({ type: 'float', default: 0.6 })
  passPercentage: number;

  @Column()
  teacherId: string;

  @Column({ default: 'draft' })
  status: string; // 'draft', 'active', 'closed', 'archived'

  @Column({ nullable: true })
  deadline: Date;

  @Column({ nullable: true })
  publishedAt: Date;

  @Column({ nullable: true })
  closedAt: Date;

  @Column('simple-json', { nullable: true })
  gradingCriteria: {
    topicRelevance: { weight: number; enabled: boolean };
    structure: { weight: number; enabled: boolean };
    contentQuality: { weight: number; enabled: boolean };
    grammar: { weight: number; enabled: boolean };
    length: { weight: number; enabled: boolean };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  isProcessing: boolean;

  teacher?: User;
  submissions?: Submission[];
}