import { Donation, PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

function getDonations(size: number = 500): Donation[] {
  const donations: Partial<Donation>[] = []

  for (let i = 0; i < size; i++) {
    const tnx_id = `TXN${Math.floor(Math.random() * 1000000000)}`
    const ammount = Math.floor(Math.random() * 5000) + 100
    donations.push({
      paymentTransactionId: tnx_id,
      amount: Decimal(ammount),
      status: 'APPROVED',
      paymentCheckoutUrl: `https://payment-gateway.com/checkout/${tnx_id}`,
      projectId: null,
      institutionId: null,
    })
  }
  return donations as Donation[]
}

export async function seedDonations(prisma: PrismaClient) {
  const donorAccount = await prisma.account.findUnique({
    where: { email: 'donor@reapp.com' },
    include: { donor: { select: { id: true } } },
  })

  if (!donorAccount || !donorAccount.donor.id) {
    console.error('Donor account not found. Please run account seed first.')
    return
  }

  const donations = getDonations(5000).map((donation) => ({
    ...donation,
    donorId: donorAccount.donor.id,
  }))
  console.log(`Seeding ${donations.length} donations...`)

  await prisma.donation.createMany({
    data: donations,
  })
}
