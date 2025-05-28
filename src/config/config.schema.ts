import { z } from 'zod'

export const ConfigSchema = z.object({
  // Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Application
  APP_NAME: z.string().min(1).default('Reapp'),
  API_VERSION: z.string().min(1).default('v1'),

  // Server
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Redis
  REDIS_HOST: z.string().min(1).default('redis'),
  REDIS_PORT: z.coerce.number().default(6379),

  // Email
  EMAIL_HOST: z.string().min(1),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_USER: z.string().min(1),
  EMAIL_PASSWORD: z.string().min(1),
  EMAIL_FROM: z.string().min(1),

  // MercadoPago
  MERCADOPAGO_NOTIFICATION_URL: z.string().min(1),
})

export type ConfigType = z.infer<typeof ConfigSchema>
