import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { extractWsToken } from '../utils/ws-token.utils';

@Injectable()
export class WsAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async authenticateSocket(client: Socket): Promise<{ userId: string; email: string } | null> {
    if (client.data.user) return client.data.user;

    const token = extractWsToken(client);
    if (!token) return null;

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      client.data.user = { userId: payload.sub, email: payload.email };
      return client.data.user;
    } catch {
      return null;
    }
  }
}
