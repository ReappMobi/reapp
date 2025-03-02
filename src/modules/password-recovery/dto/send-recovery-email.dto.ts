import { IsEmail } from 'class-validator'

export class SendRecoveryEmailDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string
}
