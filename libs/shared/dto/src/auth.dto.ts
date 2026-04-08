import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  UserResponse,
  AuthResponse,
} from '@chat-app/shared/api-types';

export class RegisterDto implements RegisterRequest {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'johndoe', minLength: 3, maxLength: 30 })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username!: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password!: string;
}

export class RefreshTokenDto implements RefreshTokenRequest {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class UserResponseDto implements UserResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  createdAt!: string;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty()
  user!: UserResponseDto;
}
