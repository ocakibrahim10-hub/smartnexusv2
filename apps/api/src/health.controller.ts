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
      // Run migrations at runtime and completely reset the database to avoid foreign key conflicts
      execSync('npx prisma db push --force-reset --accept-data-loss --schema=apps/api/prisma/schema.prisma');
      
      // Run the FULL seed script using ts-node --transpile-only to guarantee latest code AND avoid OOM
      const output = execSync('npx ts-node --transpile-only apps/api/prisma/seed.ts', { encoding: 'utf-8' });

      return { success: true, message: 'Migrations applied and FULL database seeded successfully', output };
    } catch (e: any) {
      return { success: false, error: e.message, stack: e.stack, stdout: e.stdout ? e.stdout.toString() : '' };
    }
  }
}
