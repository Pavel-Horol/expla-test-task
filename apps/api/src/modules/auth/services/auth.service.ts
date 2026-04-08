import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { StringValue } from 'ms';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@chat-app/shared/interfaces';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  UserResponseDto,
} from '@chat-app/shared/dto';
import { BcryptService } from './bcrypt.service';
import { User } from '@chat-app/shared/entities';
import { AUTH_EVENTS, UserRegisteredEvent } from '@chat-app/shared/events';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const exists = await this.userRepository.existsByEmail(dto.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.bcryptService.hash(dto.password);

    const user = await this.userRepository.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
    });

    this.eventEmitter.emit(AUTH_EVENTS.USER_REGISTERED, {
      userId: user.id,
    } satisfies UserRegisteredEvent);

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.toUserResponse(user),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.bcryptService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.toUserResponse(user),
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findByIdOrFail(payload.sub);
      const tokens = await this.generateTokens(user);

      return {
        ...tokens,
        user: this.toUserResponse(user),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdOrFail(userId);
    return this.toUserResponse(user);
  }

  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = { sub: user.id, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? '',
        expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? '',
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as StringValue,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
