import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'OK',
      message: 'AI Assignment Checker Backend is running',
      timestamp: new Date().toISOString(),
    };
  }
}