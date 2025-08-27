import * as fs from 'fs'
import * as path from 'path'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import * as express from 'express'
import helmet from 'helmet'

import { Logger, LoggerErrorInterceptor } from 'nestjs-pino'
import { AppModule } from './app.module'
import { ConfigService } from './config/config.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })

  const appLogger = app.get(Logger)
  app.useLogger(appLogger)
  app.useGlobalInterceptors(new LoggerErrorInterceptor())

  const configService = app.get(ConfigService)
  app.enableCors({
    origin: configService.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  })

  // Static files
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )
  appLogger.log('GlobalPipes (ValidationPipe) configured.', 'Bootstrap')

  const uploadsDirectoryName = 'uploads'
  const resolvedUploadsPath = path.resolve(process.cwd(), uploadsDirectoryName)

  appLogger.log(
    `Attempting to serve static files from virtual path '/${uploadsDirectoryName}'.`,
    'Bootstrap',
  )
  appLogger.log(`Current working dir is ${process.cwd()}`)
  appLogger.log(
    `Physical path mapped to: '${resolvedUploadsPath}'`,
    'Bootstrap',
  )

  // Check if the resolved path actually exists
  if (fs.existsSync(resolvedUploadsPath)) {
    const stats = fs.statSync(resolvedUploadsPath)
    if (stats.isDirectory()) {
      appLogger.log(
        `Verified: Directory exists at '${resolvedUploadsPath}'.`,
        'Bootstrap',
      )
      // Serve static files
      app.use(`/${uploadsDirectoryName}`, express.static(resolvedUploadsPath))
      appLogger.log(
        `Successfully configured static serving for '/${uploadsDirectoryName}'. Access files at /${uploadsDirectoryName}/<filename>`,
        'Bootstrap',
      )
    } else {
      appLogger.error(
        `Error: Path '${resolvedUploadsPath}' exists but is not a directory. Static serving NOT configured.`,
        'Bootstrap',
      )
    }
  } else {
    appLogger.error(
      `Error: Directory '${resolvedUploadsPath}' does NOT exist. Static serving NOT configured.`,
      'Bootstrap',
    )
  }
  // --- End Static files ---

  // -- Helmet config ---
  app.use(helmet())

  await app.listen(configService.PORT)
}

bootstrap()
