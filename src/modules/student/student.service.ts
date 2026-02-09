import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  async create(
    createStudentDto: CreateStudentDto,
    teacherId: string,
  ): Promise<Student> {
    // Check if roll number already exists for this teacher
    const existingStudent = await this.studentRepository.findOne({
      where: {
        rollNumber: createStudentDto.rollNumber,
        teacherId: teacherId,
      } as any,
    });

    if (existingStudent) {
      throw new ConflictException(
        `Student with roll number ${createStudentDto.rollNumber} already exists`,
      );
    }

    const student = this.studentRepository.create({
      ...createStudentDto,
      id: uuidv4(),
      teacherId,
    });

    return this.studentRepository.save(student);
  }

  async bulkImport(
    students: CreateStudentDto[],
    teacherId: string,
  ): Promise<{
    success: Student[];
    failed: Array<{ student: CreateStudentDto; error: string }>;
  }> {
    const success: Student[] = [];
    const failed: Array<{ student: CreateStudentDto; error: string }> = [];

    for (const studentDto of students) {
      try {
        const student = await this.create(studentDto, teacherId);
        success.push(student);
      } catch (error) {
        failed.push({
          student: studentDto,
          error: error.message,
        });
      }
    }

    return { success, failed };
  }

  async findAll(
    teacherId: string,
    options?: {
      search?: string;
      class?: string;
      section?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ students: Student[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const query: any = { teacherId };

    // Add filters
    if (options?.class) {
      query.class = options.class;
    }

    if (options?.section) {
      query.section = options.section;
    }

    // Search functionality
    if (options?.search) {
      const search = options.search.toLowerCase();
      const allStudents = await this.studentRepository.find({
        where: query as any,
      });

      const filtered = allStudents.filter(
        (student) =>
          student.name.toLowerCase().includes(search) ||
          student.rollNumber.toLowerCase().includes(search) ||
          student.email?.toLowerCase().includes(search),
      );

      return {
        students: filtered.slice(skip, skip + limit),
        total: filtered.length,
      };
    }

    const [students, total] = await this.studentRepository.findAndCount({
      where: query as any,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { students, total };
  }

  async findOne(id: string, teacherId: string): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id, teacherId } as any,
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return student;
  }

  async findByRollNumber(
    rollNumber: string,
    teacherId: string,
  ): Promise<Student | null> {
    return this.studentRepository.findOne({
      where: { rollNumber, teacherId } as any,
    });
  }

  async update(
    id: string,
    teacherId: string,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    const student = await this.findOne(id, teacherId);

    // Check for roll number conflict if updating
    if (updateStudentDto.rollNumber) {
      const existing = await this.studentRepository.findOne({
        where: {
          rollNumber: updateStudentDto.rollNumber,
          teacherId,
        } as any,
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Student with roll number ${updateStudentDto.rollNumber} already exists`,
        );
      }
    }

    Object.assign(student, updateStudentDto);
    return this.studentRepository.save(student);
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const student = await this.findOne(id, teacherId);
    await this.studentRepository.remove(student);
  }

  async validateStudentExists(
    rollNumber: string,
    teacherId: string,
  ): Promise<Student> {
    const student = await this.findByRollNumber(rollNumber, teacherId);

    if (!student) {
      throw new BadRequestException(
        `No student found with roll number ${rollNumber}. Please add the student first.`,
      );
    }

    return student;
  }

  async getClassSections(teacherId: string): Promise<{
    classes: string[];
    sections: string[];
  }> {
    const students = await this.studentRepository.find({
      where: { teacherId } as any,
    });

    const classes = [
      ...new Set(students.map((s) => s.class).filter(Boolean)),
    ];
    const sections = [
      ...new Set(students.map((s) => s.section).filter(Boolean)),
    ];

    return { classes, sections };
  }
}
