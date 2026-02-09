import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from './entities/submission.entity';
import { Assignment } from '../assignment/entities/assignment.entity';
import { EvaluationResult } from '../evaluation/entities/evaluation-result.entity';
import { PdfService } from './services/pdf.service';
import { EvaluationService } from '../evaluation/evaluation.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
    @InjectRepository(EvaluationResult)
    private evaluationRepository: Repository<EvaluationResult>,
    private pdfService: PdfService,
    private evaluationService: EvaluationService,
  ) {}

  async uploadAndProcessSubmissions(
    assignmentId: string,
    files: Express.Multer.File[],
    teacherId: string,
  ): Promise<{
    uploadedCount: number;
    processingStarted: boolean;
    submissions: Submission[];
  }> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.teacherId !== teacherId) {
      throw new BadRequestException('Unauthorized');
    }

    // Check assignment status - only accept submissions for active assignments
    if (assignment.status && assignment.status !== 'active') {
      throw new BadRequestException(
        `Cannot accept submissions for ${assignment.status} assignments. Assignment must be in 'active' status.`,
      );
    }

    const submissions: Submission[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        if (!file.mimetype.includes('pdf')) {
          continue;
        }

        const studentInfo =
          await this.pdfService.extractStudentInfo(file.originalname);
        
        let fileContent = '';
        let submissionStatus = 'pending';
        const MIN_READABLE_TEXT_LENGTH = 10; // Minimum characters to consider PDF readable

        try {
          fileContent = await this.pdfService.extractTextFromPDF(file.buffer);
          
          // Check if PDF is image-only (no meaningful text extracted)
          if (!fileContent || fileContent.trim().length < MIN_READABLE_TEXT_LENGTH) {
            console.warn(
              `PDF appears to be image-only or unreadable: ${file.originalname}`,
            );
            submissionStatus = 'unreadable';
            fileContent =
              'ERROR: Could not extract text from PDF. This appears to be an image-only PDF. Please provide a text-based PDF.';
          }
        } catch (e) {
          console.warn(`Failed to parse text from ${file.originalname}:`, e);
          submissionStatus = 'unreadable';
          fileContent =
            'ERROR: Failed to process PDF file. Please ensure it is a valid PDF.';
        }

        const submission = this.submissionRepository.create({
          id: uuidv4(),
          studentName: studentInfo.name,
          studentRollNumber: studentInfo.rollNumber,
          fileContent,
          fileName: file.originalname,
          assignmentId,
          submissionStatus,
        });

        const saved = await this.submissionRepository.save(submission);
        submissions.push(saved);
      } catch (error) {
        console.error(`Failed to process file ${file.originalname}:`, error);
        errors.push(`${file.originalname}: ${error.message}`);
      }
    }

    // Start evaluation process in background
    this.evaluateSubmissionsAsync(
      assignment,
      submissions,
    ).catch((error) => {
      console.error('Error during async evaluation:', error);
    });

    return {
      uploadedCount: submissions.length,
      processingStarted: true,
      submissions,
    };
  }

  private async evaluateSubmissionsAsync(
    assignment: Assignment,
    submissions: Submission[],
  ): Promise<void> {
    await this.assignmentRepository.update(
      { id: assignment.id },
      { isProcessing: true },
    );

    try {
      for (const submission of submissions) {
        try {
          // Skip evaluation for unreadable PDFs
          if (submission.submissionStatus === 'unreadable') {
            console.warn(
              `Skipping evaluation for unreadable submission: ${submission.id}`,
            );
            submission.submissionStatus = 'unreadable';
            await this.submissionRepository.save(submission);
            continue;
          }

          const evaluation = await this.evaluationService.evaluateSubmission(
            assignment,
            submission,
          );
          submission.evaluation = evaluation;
          submission.isEvaluated = true;
          submission.submissionStatus = 'evaluated';
          await this.submissionRepository.save(submission);
        } catch (err) {
          console.error(`Failed to evaluate submission ${submission.id}:`, err);
          submission.submissionStatus = 'evaluation_error';
          submission.isEvaluated = false;
          await this.submissionRepository.save(submission);
        }
      }
    } finally {
      await this.assignmentRepository.update(
        { id: assignment.id },
        { isProcessing: false },
      );
    }
  }

  async getSubmissionsByAssignment(
    assignmentId: string,
    evaluated?: boolean,
  ): Promise<Submission[]> {
    const query = this.submissionRepository
      .createQueryBuilder('submission')
      .where('submission.assignmentId = :assignmentId', { assignmentId })
      .leftJoinAndSelect('submission.evaluation', 'evaluation');

    if (evaluated !== undefined) {
      query.andWhere('submission.isEvaluated = :evaluated', { evaluated });
    }

    return query.orderBy('submission.uploadedAt', 'DESC').getMany();
  }

  async getSubmissionById(id: string): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Manually load assignment and evaluation
    submission.assignment = await this.assignmentRepository.findOne({
      where: { id: submission.assignmentId },
    });

    submission.evaluation = await this.evaluationRepository.findOne({
      where: { submissionId: id },
    });

    return submission;
  }
}