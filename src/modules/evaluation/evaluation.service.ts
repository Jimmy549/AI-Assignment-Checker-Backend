import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationResult } from './entities/evaluation-result.entity';
import { Submission } from '../submission/entities/submission.entity';
import { Assignment } from '../assignment/entities/assignment.entity';
import { AiEvaluationService } from './services/ai-evaluation.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(EvaluationResult)
    private evaluationRepository: Repository<EvaluationResult>,
    private aiEvaluationService: AiEvaluationService,
  ) {}

  async evaluateSubmission(
    assignment: Assignment,
    submission: Submission,
    version: number = 1,
  ): Promise<EvaluationResult> {
    try {
      const evaluationData = await this.aiEvaluationService.evaluateSubmission({
        instructions: assignment.instructions,
        studentContent: submission.fileContent,
        minWords: assignment.minWords,
        markingMode: assignment.markingMode,
        totalMarks: assignment.totalMarks,
        passPercentage: assignment.passPercentage,
        gradingCriteria: assignment.gradingCriteria,
      });

      const percentageScore =
        (evaluationData.score / assignment.totalMarks) * 100;
      const passPercentageValue = assignment.passPercentage * 100;
      const passed = percentageScore >= passPercentageValue;

      const evaluation = this.evaluationRepository.create({
        id: uuidv4(),
        submissionId: submission.id,
        aiScore: evaluationData.score,
        score: evaluationData.score, // Initially same as AI score
        percentageScore,
        remarks: evaluationData.remarks,
        detailedFeedback: evaluationData.detailedFeedback,
        passed,
        version,
      });

      return this.evaluationRepository.save(evaluation);
    } catch (error) {
      // Standard logger used in main.ts/filter will handle this
      throw error;
    }
  }

  async getEvaluationBySubmissionId(
    submissionId: string,
  ): Promise<EvaluationResult | null> {
    return this.evaluationRepository.findOne({
      where: { submissionId } as any,
    });
  }

  async manualOverride(
    id: string,
    teacherId: string,
    teacherScore?: number,
    teacherComments?: string,
  ): Promise<EvaluationResult> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id } as any,
    });

    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }

    // Update manual review fields
    if (teacherScore !== undefined) {
      evaluation.teacherScore = teacherScore;
      evaluation.score = teacherScore; // Final score is teacher's score
    }

    if (teacherComments !== undefined) {
      evaluation.teacherComments = teacherComments;
    }

    evaluation.isManuallyReviewed = true;
    evaluation.reviewedBy = teacherId;
    evaluation.reviewedAt = new Date();

    return this.evaluationRepository.save(evaluation);
  }

  async reEvaluate(
    submissionId: string,
    assignment: Assignment,
    submission: Submission,
  ): Promise<EvaluationResult> {
    // Get existing evaluation
    const existingEvaluation = await this.getEvaluationBySubmissionId(
      submissionId,
    );

    let version = 1;
    if (existingEvaluation) {
      version = existingEvaluation.version + 1;
      // Delete old evaluation (or archive it - depending on requirements)
      await this.evaluationRepository.remove(existingEvaluation);
    }

    // Create new evaluation
    return this.evaluateSubmission(assignment, submission, version);
  }

  async updateEvaluation(
    id: string,
    data: { score?: number; remarks?: string },
  ): Promise<EvaluationResult> {
    const evaluation = await this.evaluationRepository.findOne({
      where: { id } as any,
    });

    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }

    if (data.score !== undefined) {
      evaluation.score = data.score;
    }

    if (data.remarks !== undefined) {
      evaluation.remarks = data.remarks;
    }

    return this.evaluationRepository.save(evaluation);
  }
}