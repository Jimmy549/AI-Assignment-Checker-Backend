import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from '../assignment/entities/assignment.entity';
import * as XLSX from 'xlsx';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Assignment)
    private assignmentRepository: Repository<Assignment>,
  ) {}

  async generateMarksSheetCSV(assignmentId: string): Promise<string> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Get submissions
    const submissions = await this.assignmentRepository.manager
      .getRepository('submissions')
      .find({ where: { assignmentId } });

    // CSV Header
    const headers = [
      'Student Name',
      'Roll Number',
      'Score',
      'Percentage',
      'Status',
      'Evaluation Status',
      'Remarks',
    ];

    // CSV Rows - Include ALL submissions
    const rows = [];
    for (const sub of submissions) {
      let score = 'N/A';
      let percentage = 'N/A';
      let status = 'PENDING';
      let remarks = 'Not yet evaluated';
      let evaluationStatus = sub.submissionStatus || 'pending';

      // Check if evaluated
      if (sub.isEvaluated) {
        const evaluation = await this.assignmentRepository.manager
          .getRepository('evaluation_results')
          .findOne({ where: { submissionId: sub.id } });

        if (evaluation) {
          score = evaluation.score.toFixed(2);
          percentage = evaluation.percentageScore.toFixed(2);
          status = evaluation.passed ? 'PASS' : 'FAIL';
          remarks = evaluation.remarks;
          evaluationStatus = 'evaluated';
        }
      } else if (sub.submissionStatus === 'unreadable') {
        remarks = 'Cannot evaluate - PDF is unreadable/image-only';
        evaluationStatus = 'unreadable';
      } else if (sub.submissionStatus === 'evaluation_error') {
        remarks = 'Evaluation failed - Please try re-evaluating';
        evaluationStatus = 'error';
      }

      rows.push([
        `"${sub.studentName}"`,
        sub.studentRollNumber,
        score,
        percentage,
        status,
        evaluationStatus,
        `"${remarks.replace(/"/g, '""')}"`,
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  }

  async generateMarksSheetExcel(assignmentId: string): Promise<Buffer> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Get submissions
    const submissions = await this.assignmentRepository.manager
      .getRepository('submissions')
      .find({ where: { assignmentId } });

    const data = [];
    for (const sub of submissions) {
      let score = null;
      let percentage = null;
      let status = 'PENDING';
      let remarks = 'Not yet evaluated';
      let evaluationStatus = sub.submissionStatus || 'pending';

      // Check if evaluated
      if (sub.isEvaluated) {
        const evaluation = await this.assignmentRepository.manager
          .getRepository('evaluation_results')
          .findOne({ where: { submissionId: sub.id } });

        if (evaluation) {
          score = parseFloat(evaluation.score.toFixed(2));
          percentage = parseFloat(evaluation.percentageScore.toFixed(2));
          status = evaluation.passed ? 'PASS' : 'FAIL';
          remarks = evaluation.remarks;
          evaluationStatus = 'evaluated';
        }
      } else if (sub.submissionStatus === 'unreadable') {
        remarks = 'Cannot evaluate - PDF is unreadable/image-only';
        evaluationStatus = 'unreadable';
      } else if (sub.submissionStatus === 'evaluation_error') {
        remarks = 'Evaluation failed - Please try re-evaluating';
        evaluationStatus = 'error';
      }

      data.push({
        'Student Name': sub.studentName,
        'Roll Number': sub.studentRollNumber,
        'Score': score || 'N/A',
        'Percentage': percentage || 'N/A',
        'Status': status,
        'Evaluation Status': evaluationStatus,
        'Remarks': remarks,
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks Sheet');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}