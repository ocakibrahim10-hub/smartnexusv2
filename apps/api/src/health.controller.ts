import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return { status: 'ok', service: 'smartnexus-api', timestamp: new Date().toISOString() };
  }
}
