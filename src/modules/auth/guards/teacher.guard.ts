import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class TeacherGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found in request');
    }

    if (user.role !== 'teacher') {
      throw new ForbiddenException(
        'Only teachers can perform this action. Access denied.',
      );
    }

    return true;
  }
}
