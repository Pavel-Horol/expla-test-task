import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  type: 'mongo' | 'memory';
  uri?: string;
}

export default registerAs('database', (): DatabaseConfig => ({
  type: process.env.DB_TYPE as 'mongo' | 'memory',
  uri: process.env.MONGODB_URI,
}));
