import { Socket } from 'socket.io';

export function extractWsToken(client: Socket): string | null {
  const queryToken = client.handshake.query?.token;
  if (typeof queryToken === 'string') return queryToken;

  const authToken = client.handshake.auth?.token;
  if (typeof authToken === 'string') return authToken;

  const authHeader = client.handshake.headers?.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}
