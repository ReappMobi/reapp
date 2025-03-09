import { AccountStatus, AccountType } from '@prisma/client'
import { IsEnum, IsOptional } from 'class-validator'

export abstract class GetAccountsQuery {
  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType

  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus
}
