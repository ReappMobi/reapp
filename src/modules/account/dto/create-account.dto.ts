import { Expose, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum AccountType {
  DONOR = 'donor',
  INSTITUTION = 'institution',
}

abstract class AccountField {
  @Expose()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  value: string;
}

export abstract class CreateAccountDto {
  @Expose()
  @IsNotEmpty({ message: 'O tipo de conta é obrigatório.' })
  @IsEnum(AccountType, { message: 'Tipo de conta inválido.' })
  accountType: AccountType;

  @Expose()
  @IsEmail({}, { message: 'O formato de email é inválido.' })
  @IsNotEmpty({ message: 'O email é obrigatório.' })
  email: string;

  @Expose()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string;

  @Expose()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name: string;

  @Expose()
  @ValidateIf((o) => o.accountType === AccountType.INSTITUTION)
  @IsNotEmpty({ message: 'O telefone é obrigatório para instituições.' })
  phone?: string;

  @Expose()
  @ValidateIf((o) => o.accountType === AccountType.INSTITUTION)
  @IsNotEmpty({ message: 'O CNPJ é obrigatório para instituições.' })
  @MinLength(14, { message: 'O CNPJ deve ter no mínimo 14 caracteres.' })
  cnpj?: string;

  @Expose()
  @ValidateIf((o) => o.accountType === AccountType.INSTITUTION)
  @IsNotEmpty({ message: 'A categoria é obrigatória para instituições.' })
  @IsString({ message: 'A categoria deve ser uma string.' })
  @MinLength(3, { message: 'A categoria deve ter no mínimo 3 caracteres.' })
  @MaxLength(20, { message: 'A categoria deve ter no máximo 20 caracteres.' })
  category?: string;

  @Expose()
  @ValidateIf((o) => o.accountType === AccountType.INSTITUTION)
  @ValidateNested({ each: true })
  @Type(() => AccountField)
  @IsOptional()
  fields?: AccountField[];

  @Expose()
  @IsOptional()
  @IsString({ message: 'O avatar deve ser uma string.' })
  avatar?: string;
}

export abstract class CreateAccountGoogleDto {
  @Expose()
  @IsNotEmpty({ message: 'O token é obrigatório.' })
  idToken: string;
}
