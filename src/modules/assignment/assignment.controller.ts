import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeacherGuard } from '../auth/guards/teacher.guard';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Controller('assignments')
@UseGuards(JwtAuthGuard, TeacherGuard)
export class AssignmentController {
  constructor(private assignmentService: AssignmentService) {}

  @Post()
  async createAssignment(@Body() dto: CreateAssignmentDto, @Req() req: any) {
    // req.user is populated by JwtStrategy
    const teacherId = req.user.id; 
    return this.assignmentService.createAssignment(dto, teacherId);
  }

  @Get()
  async getAssignments(@Req() req: any) {
    const teacherId = req.user.id;
    return this.assignmentService.getAssignmentsByTeacher(teacherId);
  }

  @Get(':id')
  async getAssignment(@Param('id') id: string) {
    return this.assignmentService.getAssignmentById(id);
  }

  @Delete(':id')
  async deleteAssignment(@Param('id') id: string, @Req() req: any) {
    const teacherId = req.user.id;
    return this.assignmentService.deleteAssignment(id, teacherId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    return this.assignmentService.updateStatus(id, body.status, req.user.id);
  }

  @Post(':id/re-evaluate-all')
  async reEvaluateAll(@Param('id') id: string, @Req() req: any) {
    return this.assignmentService.reEvaluateAllSubmissions(id, req.user.id);
  }
}