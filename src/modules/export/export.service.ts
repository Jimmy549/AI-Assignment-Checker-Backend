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

  private getColorForStatus(status: string): string {
    switch (status) {
      case 'PASS':
        return 'C6EFCE'; // Green
      case 'FAIL':
        return 'FFC7CE'; // Red
      default:
        return 'FFEB9C'; // Yellow
    }
  }

  private formatExcelHeaders(ws: XLSX.WorkSheet, firstRow: number = 1): void {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_col(col) + firstRow;
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { patternType: 'solid', fgColor: { rgb: '366092' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
          },
        };
      }
    }
  }

  private autoSizeColumns(
    ws: XLSX.WorkSheet,
    data: any[],
  ): { wch: number }[] {
    if (data.length === 0) return [];
    const colWidths = [];
    const keys = Object.keys(data[0]);
    for (const key of keys) {
      let maxLength = key.length + 2;
      for (const row of data) {
        const cellValue = (row[key] || '').toString();
        if (cellValue.length > maxLength) {
          maxLength = cellValue.length;
        }
      }
      colWidths.push({ wch: Math.min(maxLength + 2, 50) });
    }
    return colWidths;
  }

  async generateMarksSheetCSV(assignmentId: string): Promise<string> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Get submissions with all fields
    const submissions = await this.assignmentRepository.manager
      .getRepository('submissions')
      .find({ where: { assignmentId } });

    // Professional CSV Header
    const headers = [
      'SNo',
      'Student Name',
      'Roll Number',
      'Submission Date',
      'Score (Out of 100)',
      'Percentage (%)',
      'Status',
      'Evaluation Status',
      'Remarks',
    ];

    // CSV Rows - Include ALL submissions with proper formatting
    const rows = [];
    let serialNo = 1;

    for (const sub of submissions) {
      let score = 'N/A';
      let percentage = 'N/A';
      let status = 'PENDING';
      let remarks = 'Not yet evaluated';
      let evaluationStatus = sub.submissionStatus || 'pending';
      const submissionDate = sub.submittedAt
        ? new Date(sub.submittedAt).toLocaleDateString('en-IN')
        : 'N/A';

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
        serialNo,
        `"${sub.studentName}"`,
        sub.studentRollNumber,
        submissionDate,
        score,
        percentage,
        status,
        evaluationStatus,
        `"${remarks.replace(/"/g, '""')}"`,
      ]);
      serialNo++;
    }

    // Add summary section
    const evaluatedCount = submissions.filter((s) => s.isEvaluated).length;
    const pendingCount = submissions.length - evaluatedCount;
    const passCount = submissions.filter(
      (s) =>
        s.isEvaluated &&
        s.isEvaluated === true,
    ).length;

    const csvContent = [
      `"Marks Sheet for Assignment: ${assignment.title}"`,
      `"Generated Date: ${new Date().toLocaleDateString('en-IN')}"`,
      `"Total Submissions: ${submissions.length} | Evaluated: ${evaluatedCount} | Pending: ${pendingCount}"`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
      '',
      `"Summary"`,
      `"Total Students: ${submissions.length}"`,
      `"Evaluated: ${evaluatedCount}"`,
      `"Pending: ${pendingCount}"`,
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

    // Get submissions with all related data
    const submissions = await this.assignmentRepository.manager
      .getRepository('submissions')
      .find({
        where: { assignmentId },
        relations: ['submissionEvaluations'],
      });

    const data = [];
    let serialNo = 1;

    for (const sub of submissions) {
      let score = null;
      let percentage = null;
      let status = 'PENDING';
      let remarks = 'Not yet evaluated';
      let evaluationStatus = sub.submissionStatus || 'pending';
      const submissionDate = sub.submittedAt
        ? new Date(sub.submittedAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
        : 'N/A';

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
        'SNo': serialNo,
        'Student Name': sub.studentName || 'Unknown',
        'Roll Number': sub.studentRollNumber || 'N/A',
        'Submission Date': submissionDate,
        'Score (Out of 100)': score || 'N/A',
        'Percentage (%)': percentage || 'N/A',
        'Status': status,
        'Evaluation Status': evaluationStatus,
        'Remarks': remarks.substring(0, 100), // Limit remarks length
      });
      serialNo++;
    }

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();

    // Main Sheet - Marks Sheet
    if (data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data);

      // Format headers and apply styling
      this.formatExcelHeaders(ws, 1);

      // Set column widths
      ws['!cols'] = this.autoSizeColumns(ws, data);

      // Add borders and formatting to data rows
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (ws[cellAddress]) {
            const statusColIndex = 6; // Status column

            // Apply row coloring based on status
            if (col === statusColIndex) {
              const cellValue = ws[cellAddress].v;
              const bgColor = this.getColorForStatus(cellValue);

              ws[cellAddress].s = {
                fill: { patternType: 'solid', fgColor: { rgb: bgColor } },
                font: { bold: true, color: { rgb: '000000' } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: {
                  top: { style: 'thin' },
                  bottom: { style: 'thin' },
                  left: { style: 'thin' },
                  right: { style: 'thin' },
                },
                numFmt: '0',
              };
            } else {
              // Standard formatting for other columns
              ws[cellAddress].s = {
                alignment: { horizontal: 'left', vertical: 'center' },
                border: {
                  top: { style: 'thin' },
                  bottom: { style: 'thin' },
                  left: { style: 'thin' },
                  right: { style: 'thin' },
                },
              };

              // Right-align numbers
              if (
                col === 4 ||
                (col === 5)
              ) {
                ws[cellAddress].s.alignment = { horizontal: 'right' };
                if (typeof ws[cellAddress].v === 'number') {
                  ws[cellAddress].s.numFmt = '0.00';
                }
              }
            }
          }
        }
      }

      // Freeze first row (headers)
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };

      XLSX.utils.book_append_sheet(wb, ws, 'Marks Sheet');
    } else {
      // Create empty marks sheet if no data
      const emptyWs = XLSX.utils.json_to_sheet([
        { 'Message': 'No submissions yet for this assignment' },
      ]);
      emptyWs['!cols'] = [{ wch: 50 }];
      XLSX.utils.book_append_sheet(wb, emptyWs, 'Marks Sheet');
    }

    // Summary Sheet
    const evaluatedCount = submissions.filter((s) => s.isEvaluated).length;
    const pendingCount = submissions.length - evaluatedCount;
    const summaryData = [
      { 'Metric': 'Total Submissions', 'Value': submissions.length },
      { 'Metric': 'Evaluated', 'Value': evaluatedCount },
      { 'Metric': 'Pending', 'Value': pendingCount },
      {
        'Metric': 'Pass Rate',
        'Value':
          submissions.length > 0
            ? ((evaluatedCount / submissions.length) * 100).toFixed(2) + '%'
            : 'N/A',
      },
    ];

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 25 }, { wch: 15 }];
    this.formatExcelHeaders(summaryWs, 1);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    if (!buffer || buffer.length === 0) {
      throw new Error('Failed to generate Excel file - buffer is empty');
    }

    return buffer;
  }
}