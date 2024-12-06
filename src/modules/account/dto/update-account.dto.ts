import { Expose, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AccountType } from '@prisma/client';

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

export abstract class UpdateAccountDto {
  @Expose()
  @IsOptional()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name?: string;

  @Expose()
  @ValidateIf((o) => o.accountType === AccountType.INSTITUTION)
  @IsOptional()
  @IsNotEmpty({ message: 'O telefone é obrigatório para instituições.' })
  phone?: string;

  @Expose()
  @ValidateIf((o) => o.accountType === AccountType.INSTITUTION)
  @IsOptional()
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
}
