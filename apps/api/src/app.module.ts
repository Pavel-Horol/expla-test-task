import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from '@chat-app/config';
import { DatabaseModule } from '@chat-app/database';
import { pinoLoggerConfig } from '@chat-app/config/logger.config';
import { AllExceptionsFilter } from '@chat-app/common';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { EventsModule } from './modules/events/events.module';
import { MessagesModule } from './modules/messages/messages.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    AppConfigModule,
    EventEmitterModule.forRoot(),
    LoggerModule.forRoot(pinoLoggerConfig),
    DatabaseModule.forRoot(),
    AuthModule,
    ChatModule,
    EventsModule,
    MessagesModule,
    RoomsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
          disableErrorMessages: false,
        }),
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
