import { Expose } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum AccountType {
  DONOR = 'donor',
  INSTITUTION = 'institution',
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
  @IsNotEmpty({ message: 'A cidade é obrigatória para instituições.' })
  city?: string;

  @Expose()
  @ValidateIf((o) => o.accountType === AccountType.INSTITUTION)
  @IsNotEmpty({ message: 'O estado é obrigatório para instituições.' })
  state?: string;

  @Expose()
  @ValidateIf((o) => o.accountType === AccountType.INSTITUTION)
  @IsString({ message: 'O Facebook deve ser uma string.' })
  @IsOptional()
  facebook?: string;

  @Expose()
  @ValidateIf((o) => o.accountType === AccountType.INSTITUTION)
  @IsString({ message: 'O Instagram deve ser uma string.' })
  @IsOptional()
  instagram?: string;
}
