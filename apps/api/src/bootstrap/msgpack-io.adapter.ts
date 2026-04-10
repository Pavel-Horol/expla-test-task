import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { msgpackParser } from '@chat-app/shared/types';

export class MsgpackIoAdapter extends IoAdapter {
  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      parser: msgpackParser,
    });
  }
}
