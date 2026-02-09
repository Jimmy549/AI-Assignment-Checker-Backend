import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { BulkImportStudentDto } from './dto/bulk-import-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  async create(@Body() createStudentDto: CreateStudentDto, @Request() req) {
    return this.studentService.create(createStudentDto, req.user.id);
  }

  @Post('bulk')
  async bulkImport(@Body() bulkImportDto: BulkImportStudentDto, @Request() req) {
    return this.studentService.bulkImport(
      bulkImportDto.students,
      req.user.id,
    );
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('class') classFilter?: string,
    @Query('section') section?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.studentService.findAll(req.user.id, {
      search,
      class: classFilter,
      section,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('filters')
  async getFilters(@Request() req) {
    return this.studentService.getClassSections(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.studentService.findOne(id, req.user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Request() req,
  ) {
    return this.studentService.update(id, req.user.id, updateStudentDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    await this.studentService.remove(id, req.user.id);
    return { message: 'Student deleted successfully' };
  }
}
