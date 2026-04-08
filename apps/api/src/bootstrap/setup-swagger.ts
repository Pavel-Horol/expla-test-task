import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

export function setupSwagger(
  app: INestApplication,
  config: ConfigService,
  apiPrefix: string,
): void {
  const swaggerEnabled = config.get<boolean>('SWAGGER_ENABLED', true);
  if (!swaggerEnabled) {
    return;
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.get<string>('SWAGGER_TITLE', 'Chat API'))
    .setDescription(
      config.get<string>(
        'SWAGGER_DESCRIPTION',
        'Real-time chat application API',
      ),
    )
    .setVersion(config.get<string>('SWAGGER_VERSION', '1.0'))
    .addBearerAuth()
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Rooms', 'Chat rooms management')
    .addTag('Messages', 'Chat messages')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const logger = app.get(Logger);
  logger.log(
    `Swagger UI available at: http://localhost:${config.get('PORT')}/${apiPrefix}/docs`,
    'Bootstrap',
  );
}
