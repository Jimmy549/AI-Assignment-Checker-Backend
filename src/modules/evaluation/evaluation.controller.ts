import {
  Controller,
  Patch,
  Param,
  Body,
  BadRequestException,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeacherGuard } from '../auth/guards/teacher.guard';
import { ManualOverrideDto } from './dto/manual-override.dto';

@Controller('evaluations')
@UseGuards(JwtAuthGuard, TeacherGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get('submission/:submissionId')
  async getBySubmissionId(@Param('submissionId') submissionId: string) {
    const evaluation = await this.evaluationService.getEvaluationBySubmissionId(
      submissionId,
    );
    if (!evaluation) {
      throw new BadRequestException('Evaluation not found');
    }
    return evaluation;
  }

  @Patch(':id/override')
  async manualOverride(
    @Param('id') id: string,
    @Body() overrideDto: ManualOverrideDto,
    @Request() req,
  ) {
    return this.evaluationService.manualOverride(
      id,
      req.user.id,
      overrideDto.teacherScore,
      overrideDto.teacherComments,
    );
  }

  @Patch(':id')
  async updateEvaluation(
    @Param('id') id: string,
    @Body() updateData: { score: number; remarks: string },
  ) {
    if (updateData.score === undefined && updateData.remarks === undefined) {
      throw new BadRequestException('Nothing to update');
    }
    return this.evaluationService.updateEvaluation(id, updateData);
  }
}
