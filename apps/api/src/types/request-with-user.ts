import { Request } from 'express';

export type RequestWithUser = Request & {
  user: {
    userId: string;
    email?: string;
    username?: string;
  };
};
