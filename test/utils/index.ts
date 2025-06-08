import { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as request from 'supertest'

const createAdmin = async () => {
  const prisma = new PrismaClient()

  const account = await prisma.account.findUnique({
    where: {
      email: 'admin@reapp.com',
    },
  })

  if (account) {
    return
  }

  await prisma.account.create({
    data: {
      name: 'Admin',
      email: 'admin@reapp.com',
      passwordHash: bcrypt.hashSync('pass1234', 10),
      accountType: 'ADMIN',
    },
  })
}

export const mockAdmin = async (app: INestApplication) => {
  await createAdmin()

  const response = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'admin@reapp.com',
    password: 'pass1234',
  })
  return response.body
}

export const mockInstitution = async (app: INestApplication) => {
  const response = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'institution@reapp.com',
    password: 'pass1234',
  })
  return response.body
}

export const mockDonor = async (app: INestApplication) => {
  const response = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'donor@reapp.com',
    password: 'pass1234',
  })
  return response.body
}
