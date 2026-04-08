import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api'),

  DB_TYPE: Joi.string().valid('mongo', 'memory').required(),
  MONGODB_URI: Joi.string().when('DB_TYPE', {
    is: 'mongo',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  WS_CORS_ORIGIN: Joi.string().uri().default('http://localhost:3001'),

  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
  LOG_PRETTY: Joi.boolean().default(false),

  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_TITLE: Joi.string().default('API Documentation'),
  SWAGGER_DESCRIPTION: Joi.string().default('API Description'),
  SWAGGER_VERSION: Joi.string().default('1.0'),

  BOTS_ENABLED: Joi.boolean().default(true),
  SPAM_BOT_MIN_SECONDS: Joi.number().integer().min(1).default(10),
  SPAM_BOT_MAX_SECONDS: Joi.number()
    .integer()
    .min(Joi.ref('SPAM_BOT_MIN_SECONDS'))
    .default(120),
});
