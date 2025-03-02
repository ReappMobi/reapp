import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Min,
  MinLength,
  Validate,
  ValidateIf,
} from 'class-validator'

export abstract class ResetPasswordDto {
  @IsUUID(`4`, { message: 'Token inválido' })
  @IsNotEmpty({ message: 'Token não informado' })
  token: string

  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @IsNotEmpty({ message: 'A senha não pode ser vazia' })
  password: string

  @ValidateIf((object, value) => object.password !== value, {
    message: 'As senhas não conferem',
  })
  passwordConfirmation: string
}
