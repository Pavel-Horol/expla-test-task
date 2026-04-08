import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validationSchema } from './validation.schema';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
      validationSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
      load: [databaseConfig, jwtConfig],
    }),
  ],
})
export class AppConfigModule {}
