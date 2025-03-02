import { IsEmail, IsNotEmpty, IsNumberString, IsUUID } from 'class-validator'

export abstract class PasswordRecoveryDto {
  @IsUUID('4', { message: 'Token inválido' })
  token: string

  @IsNotEmpty({ message: 'Código não informado' })
  @IsNumberString({ no_symbols: true }, { message: 'Código inválido' })
  code: string
}
