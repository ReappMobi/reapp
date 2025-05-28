import * as path from 'path'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import * as express from 'express'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { ConfigService } from './config/config.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })
  const configService = app.get(ConfigService)

  // Enable CORS based on environment
  if (configService.isDevelopment) {
    app.enableCors({
      origin: configService.CLIENT_URL,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    })
  }

  // Static files
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))
  app.useGlobalPipes(new ValidationPipe())
  app.useLogger(app.get(Logger))

  await app.listen(configService.PORT, configService.HOST)
}

bootstrap()
