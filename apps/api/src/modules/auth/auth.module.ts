import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { BcryptService } from './services/bcrypt.service';
import { WsAuthService } from './services/ws-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET') ?? '',
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    BcryptService,
    WsAuthService,
    JwtStrategy,
    JwtAuthGuard,
    WsJwtGuard,
  ],
  exports: [AuthService, BcryptService, WsAuthService, JwtAuthGuard, WsJwtGuard, JwtModule],
})
export class AuthModule {}
