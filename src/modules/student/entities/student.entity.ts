import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ObjectIdColumn,
  ObjectId,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('students')
export class Student {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  id: string;

  @Column()
  name: string;

  @Column()
  rollNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  class: string;

  @Column({ nullable: true })
  section: string;

  @Column()
  teacherId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  teacher?: User;
}
