import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

export function configureApp(
  app: INestApplication,
  config: ConfigService,
): { apiPrefix: string } {
  app.useLogger(app.get(Logger));

  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: config.get<string>('WS_CORS_ORIGIN', 'http://localhost:4200'),
    credentials: true,
  });

  return { apiPrefix };
}
