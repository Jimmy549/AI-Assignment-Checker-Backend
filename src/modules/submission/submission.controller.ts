import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SubmissionService } from './submission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeacherGuard } from '../auth/guards/teacher.guard';

@Controller('submissions')
@UseGuards(JwtAuthGuard, TeacherGuard)
export class SubmissionController {
  constructor(private submissionService: SubmissionService) {}

  @Post('upload/:assignmentId')
  @UseInterceptors(FilesInterceptor('files', 100, { limits: { fileSize: 10485760 } }))
  async uploadSubmissions(
    @Param('assignmentId') assignmentId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.submissionService.uploadAndProcessSubmissions(
      assignmentId,
      files,
      req.user.id,
    );
  }

  @Get('assignment/:assignmentId')
  async getSubmissions(
    @Param('assignmentId') assignmentId: string,
    @Query('evaluated') evaluated?: string,
  ) {
    const filterEvaluated = evaluated === 'true' ? true : evaluated === 'false' ? false : undefined;
    return this.submissionService.getSubmissionsByAssignment(
      assignmentId,
      filterEvaluated,
    );
  }

  @Get(':id')
  async getSubmission(@Param('id') id: string) {
    return this.submissionService.getSubmissionById(id);
  }
}