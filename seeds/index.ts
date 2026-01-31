import { PrismaClient } from '@prisma/client'
import { seedAccounts } from './account.seed'
import { seedDonations } from './dontaion.seed'

const prisma = new PrismaClient()

async function seed() {
  // await seedAccounts(prisma)
  await seedDonations(prisma)
}

seed()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
