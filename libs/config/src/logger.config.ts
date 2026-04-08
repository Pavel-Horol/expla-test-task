import { Params } from 'nestjs-pino';

export const pinoLoggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.LOG_PRETTY === 'true'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              levelFirst: true,
              translateTime: 'yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname',
              singleLine: false,
            },
          }
        : undefined,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        headers: {
          host: req.headers.host,
          'user-agent': req.headers['user-agent'],
        },
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    autoLogging: {
      ignore: (req) => {
        return req.url === '/health';
      },
    },
    customProps: () => ({
      context: 'HTTP',
    }),
  },
};
