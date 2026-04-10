import { pack, unpack } from 'msgpackr';
import { Emitter } from '@socket.io/component-emitter';
import type { Packet } from 'socket.io-parser';

export const protocol = 5;

export class Encoder {
  encode(packet: Packet): Array<Uint8Array> {
    return [pack(packet)];
  }
}

type DecoderEvents = {
  decoded: (packet: Packet) => void;
};

export class Decoder extends Emitter<DecoderEvents, DecoderEvents, {}> {
  add(data: string | ArrayBuffer | Uint8Array): void {
    if (typeof data === 'string') {
      const packet = JSON.parse(data) as Packet;
      this.emit('decoded', packet);
      return;
    }

    const view = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const packet = unpack(view) as Packet;
    this.emit('decoded', packet);
  }
}

export const msgpackParser = { Encoder, Decoder, protocol };
