import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment, MarkingMode } from './entities/assignment.entity';
import { User } from '../auth/entities/user.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { v4 as uuidv4 } from 'uuid';
import { EvaluationService } from '../evaluation/evaluation.service';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private evaluationService: EvaluationService,
  ) {}

  async createAssignment(
    dto: CreateAssignmentDto,
    teacherId: string,
  ): Promise<Assignment> {
    const teacher = await this.userRepository.findOne({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const assignment = this.assignmentRepository.create({
      id: uuidv4(),
      ...dto,
      teacherId,
      markingMode: dto.markingMode || MarkingMode.STRICT,
      minWords: dto.minWords || 500,
      totalMarks: dto.totalMarks || 100,
      passPercentage: dto.passPercentage || 0.6,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      gradingCriteria: dto.gradingCriteria || {
        topicRelevance: { weight: 30, enabled: true },
        structure: { weight: 20, enabled: true },
        contentQuality: { weight: 30, enabled: true },
        grammar: { weight: 10, enabled: true },
        length: { weight: 10, enabled: true },
      },
    });

    return this.assignmentRepository.save(assignment);
  }

  async getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]> {
    const assignments = await this.assignmentRepository.find({
      where: { teacherId },
      order: { createdAt: 'DESC' },
    });

    // Manually load submissions for each assignment
    for (const assignment of assignments) {
      const subs = (await this.assignmentRepository.manager
        .getRepository('submissions')
        .find({ where: { assignmentId: assignment.id } })) as any[];

      // Attach evaluation results to each submission when available
      for (const sub of subs) {
        const evalResult = await this.assignmentRepository.manager
          .getRepository('evaluation_results')
          .findOne({ where: { submissionId: sub.id } });

        if (evalResult) {
          sub.evaluation = {
            id: evalResult.id,
            score: evalResult.score,
            percentageScore: evalResult.percentageScore,
            remarks: evalResult.remarks,
            passed: evalResult.passed,
            detailedFeedback: evalResult.detailedFeedback,
          };
          sub.isEvaluated = true;
        } else {
          sub.evaluation = null;
          sub.isEvaluated = false;
        }
      }

      assignment.submissions = subs;
    }

    return assignments;
  }

  async getAssignmentById(id: string): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Manually load submissions and attach evaluations
    const subs = (await this.assignmentRepository.manager
      .getRepository('submissions')
      .find({ where: { assignmentId: id } })) as any[];

    for (const sub of subs) {
      const evalResult = await this.assignmentRepository.manager
        .getRepository('evaluation_results')
        .findOne({ where: { submissionId: sub.id } });

      if (evalResult) {
        sub.evaluation = {
          id: evalResult.id,
          score: evalResult.score,
          percentageScore: evalResult.percentageScore,
          remarks: evalResult.remarks,
          passed: evalResult.passed,
          detailedFeedback: evalResult.detailedFeedback,
        };
        sub.isEvaluated = true;
      } else {
        sub.evaluation = null;
        sub.isEvaluated = false;
      }
    }

    assignment.submissions = subs;

    return assignment;
  }

  async updateProcessingStatus(
    assignmentId: string,
    isProcessing: boolean,
  ): Promise<void> {
    await this.assignmentRepository.update(
      { id: assignmentId },
      { isProcessing },
    );
  }

  async deleteAssignment(id: string, teacherId: string): Promise<{ message: string }> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.teacherId !== teacherId) {
      throw new BadRequestException('Unauthorized to delete this assignment');
    }

    // Delete all submissions for this assignment
    await this.assignmentRepository.manager
      .getRepository('submissions')
      .delete({ assignmentId: id });

    // Delete the assignment itself
    await this.assignmentRepository.delete({ id });

    return { message: 'Assignment deleted successfully' };
  }

  async updateStatus(
    id: string,
    status: string,
    teacherId: string,
  ): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findOne({ where: { id } });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.teacherId !== teacherId) {
      throw new BadRequestException('Unauthorized');
    }

    assignment.status = status;
    if (status === 'active' && !assignment.publishedAt) {
      assignment.publishedAt = new Date();
    }
    if (status === 'closed' && !assignment.closedAt) {
      assignment.closedAt = new Date();
    }

    return this.assignmentRepository.save(assignment);
  }

  async reEvaluateAllSubmissions(
    assignmentId: string,
    teacherId: string,
  ): Promise<{ message: string; count: number }> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.teacherId !== teacherId) {
      throw new BadRequestException('Unauthorized');
    }

    const submissions = await this.assignmentRepository.manager
      .getRepository('submissions')
      .find({ where: { assignmentId } });

    let count = 0;
    for (const submission of submissions) {
      if (submission.submissionStatus !== 'unreadable') {
        try {
          await this.evaluationService.reEvaluateSubmission(submission.id);
          count++;
        } catch (error) {
          console.error(`Failed to re-evaluate ${submission.id}:`, error);
        }
      }
    }

    return { message: `Re-evaluated ${count} submissions`, count };
  }
}