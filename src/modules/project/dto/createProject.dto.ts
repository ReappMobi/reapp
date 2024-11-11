import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateProjectDto {
  @Expose()
  @IsString({ message: 'A descrição deve ser uma string.' })
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  description: string;

  @Expose()
  @IsString({ message: 'O nome deve ser uma string.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name: string;

  @Expose()
  @IsNotEmpty({ message: 'A categoria é obrigatória para instituições.' })
  @IsString({ message: 'A categoria deve ser uma string.' })
  @MinLength(3, { message: 'A categoria deve ter no mínimo 3 caracteres.' })
  @MaxLength(20, { message: 'A categoria deve ter no máximo 20 caracteres.' })
  category: string;

  @Expose()
  @IsString({ message: 'O subtítulo deve ser uma string.' })
  @IsNotEmpty({ message: 'O subtítulo é obrigatório.' })
  subtitle: string;
}
