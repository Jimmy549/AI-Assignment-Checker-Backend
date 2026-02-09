import { Entity, Column, CreateDateColumn, ObjectIdColumn, ObjectId } from 'typeorm';

@Entity('users')
export class User {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column()
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ default: 'teacher' })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: true })
  isActive: boolean;
}