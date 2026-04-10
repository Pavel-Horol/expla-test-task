import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';
import { setupSwagger } from './bootstrap/setup-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);

  const { apiPrefix } = configureApp(app, config);
  setupSwagger(app, config, apiPrefix);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
  logger.log(`Environment: ${config.get('NODE_ENV')}`, 'Bootstrap');
  logger.log(`Database: ${config.get('DB_TYPE')}`, 'Bootstrap');
}

bootstrap();
