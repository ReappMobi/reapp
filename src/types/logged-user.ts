import { AccountType } from '@prisma/client'

export interface LoggedUser {
  id: number
  email: string
  name: string
  accountType: AccountType
}
