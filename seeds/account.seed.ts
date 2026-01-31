import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const defaultPassword = '123456789'

export async function seedAccounts(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(defaultPassword, 10)
  const [category] = await Promise.all([
    await prisma.category.create({
      data: {
        name: 'Test',
      },
    }),
    await prisma.account.create({
      data: {
        email: 'admin@reapp.com',
        passwordHash,
        name: 'Admin',
        note: 'Admin account',
        status: 'ACTIVE',
        accountType: 'ADMIN',
      },
    }),

    await prisma.account.create({
      data: {
        email: 'donor@reapp.com',
        passwordHash,
        name: 'Donor',
        note: 'Donor account',
        status: 'ACTIVE',
        donor: {
          create: {},
        },
      },
    }),
  ])
  await prisma.account.create({
    data: {
      email: 'institution@reapp.com',
      passwordHash,
      name: 'Institution',
      note: 'Institution account',
      status: 'ACTIVE',
      institution: {
        create: {
          category: {
            connect: {
              id: category.id,
            },
          },
          cnpj: '12345678901234',
          phone: '989999999',
        },
      },
    },
  })
}
