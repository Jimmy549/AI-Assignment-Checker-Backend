import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { ExportModule } from './modules/export/export.module';
import { AuthModule } from './modules/auth/auth.module';
import { StudentModule } from './modules/student/student.module';
import { DatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(DatabaseConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
      global: true,
    }),
    AssignmentModule,
    EvaluationModule,
    SubmissionModule,
    ExportModule,
    AuthModule,
    StudentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}