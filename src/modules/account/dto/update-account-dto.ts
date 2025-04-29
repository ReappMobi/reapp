import { IsEnum } from 'class-validator'
import { AccountStatus } from '@prisma/client'

export class UpdateAccountStatusDto {
  @IsEnum(AccountStatus, {
    message: `status deve ser um dos valores: ${Object.values(AccountStatus).join(', ')}`,
  })
  status: AccountStatus
}
