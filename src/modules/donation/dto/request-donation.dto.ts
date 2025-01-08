import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export abstract class RequestDonationDto {
  @IsNotEmpty({ message: 'O valor é obrigatório.' })
  @IsNumber(
    {
      allowInfinity: false,
      allowNaN: false,
      maxDecimalPlaces: 2,
    },
    { message: 'O valor deve ser um número.' },
  )
  @IsPositive({ message: 'O valor deve ser positivo.' })
  @Min(0.01, { message: 'O valor deve ser maior que 0.' })
  @Max(500, { message: 'O valor deve ser menor que 500.' }) // TODO: Change this value
  amount: number;

  @IsOptional()
  @IsNotEmpty({ message: 'O id da instituição é obrigatório.' })
  @IsNumber(
    {
      allowInfinity: false,
      allowNaN: false,
      maxDecimalPlaces: 0,
    },
    { message: 'O id da instituição deve ser um número inteiro.' },
  )
  @IsPositive({ message: 'O id da instituição deve ser positivo.' })
  institutionId: number;

  @IsOptional()
  @IsNumber(
    {
      allowInfinity: false,
      allowNaN: false,
      maxDecimalPlaces: 0,
    },
    { message: 'O id do projeto deve ser um número inteiro.' },
  )
  @IsPositive({ message: 'O id do projeto deve ser positivo.' })
  projectId?: number;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser uma string.' })
  @MaxLength(25, { message: 'A descrição deve ter no máximo 25 aracteres.' })
  @MinLength(5, { message: 'A descrição deve ter no mínimo 5 caracteres.' })
  description: string;
}
