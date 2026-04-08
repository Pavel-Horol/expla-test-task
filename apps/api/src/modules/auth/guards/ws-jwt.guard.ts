import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { extractWsToken } from '../utils/ws-token.utils';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = extractWsToken(client);

    if (!token) {
      throw new WsException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      client.data.user = {
        userId: payload.sub,
        email: payload.email,
      };

      return true;
    } catch (error) {
      throw new WsException('Invalid token');
    }
  }
}
