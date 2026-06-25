import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return { status: 'ok', service: 'smartnexus-api', timestamp: new Date().toISOString() };
  }

  @Get('seed')
  @Public()
  async seedAdmin() {
    const { execSync } = require('child_process');
    try {
      // Run migrations at runtime
      execSync('npx prisma db push --accept-data-loss --schema=apps/api/prisma/schema.prisma');
      
      // Run the FULL seed script using compiled JS to avoid OOM from ts-node
      const output = execSync('node apps/api/dist/prisma/seed.js', { encoding: 'utf-8' });

      return { success: true, message: 'Migrations applied and FULL database seeded successfully', output };
    } catch (e: any) {
      return { success: false, error: e.message, stack: e.stack, stdout: e.stdout ? e.stdout.toString() : '' };
    }
  }
}
