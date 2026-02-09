import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeacherGuard } from '../auth/guards/teacher.guard';
import { ExportService } from './export.service';

@Controller('export')
@UseGuards(JwtAuthGuard, TeacherGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('marks-sheet/:assignmentId')
  async getMarksSheet(
    @Param('assignmentId') assignmentId: string,
    @Res() res: Response,
  ) {
    const csv = await this.exportService.generateMarksSheetCSV(assignmentId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="marks-sheet-${assignmentId}.csv"`,
    );

    res.send(csv);
  }

  @Get('marks-sheet-excel/:assignmentId')
  async getMarksSheetExcel(
    @Param('assignmentId') assignmentId: string,
    @Res() res: Response,
  ) {
    const excel = await this.exportService.generateMarksSheetExcel(assignmentId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="marks-sheet-${assignmentId}.xlsx"`,
    );

    res.send(excel);
  }
}
