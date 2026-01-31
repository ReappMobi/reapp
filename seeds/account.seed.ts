import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const defaultPassword = '123456789'

async function main() {
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  await prisma.account.create({
    data: {
      email: 'admin@reapp.com',
      passwordHash,
      name: 'Admin',
      note: 'Admin account',
      status: 'ACTIVE',
      accountType: 'ADMIN',
    },
  })

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
  })

  const category = await prisma.category.create({
    data: {
      name: 'Test',
    },
  })

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

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
