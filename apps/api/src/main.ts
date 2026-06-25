import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS
  app.enableCors({
    origin: (origin, cb) => {
      const allowed = (process.env.FRONTEND_URL || 'http://localhost:3000')
        .split(',')
        .map((s) => s.trim());
      if (!origin || allowed.some((a) => origin === a || a === '*')) cb(null, true);
      else if (origin.endsWith('.vercel.app')) cb(null, true);
      else cb(null, allowed[0]);
    },
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API prefix
  const apiPrefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(apiPrefix);
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: `/${apiPrefix}/uploads/` });

  // Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SmartNexus API')
      .setDescription('SmartNexus ERP+WMS+TMS+B2B SaaS API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  // Railway injects PORT, local dev uses API_PORT
  const port = process.env.PORT || process.env.API_PORT || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`SmartNexus API çalışıyor: http://localhost:${port}/${apiPrefix}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger Docs: http://localhost:${port}/${apiPrefix}/docs`);
  }
}

bootstrap();
