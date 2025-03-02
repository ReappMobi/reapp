import { Expose } from 'class-transformer'

import { IsEmail, IsNotEmpty } from 'class-validator'

export class LoginDto {
  @Expose()
  @IsEmail({}, { message: 'O formato de email é inválido.' })
  @IsNotEmpty({ message: 'O email é obrigatório.' })
  email: string

  @Expose()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  password: string
}
