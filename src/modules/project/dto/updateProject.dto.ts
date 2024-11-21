import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';

export class UpdateProjectDto {
  @Expose()
  @IsOptional()
  @IsString({ message: 'A descrição deve ser uma string.' })
  description?: string;

  @Expose()
  @IsOptional()
  @IsString({ message: 'O nome deve ser uma string.' })
  name?: string;

  @Expose()
  @IsOptional()
  @IsString({ message: 'A categoria deve ser uma string.' })
  @MinLength(3, { message: 'A categoria deve ter no mínimo 3 caracteres.' })
  @MaxLength(20, { message: 'A categoria deve ter no máximo 20 caracteres.' })
  category?: string;

  @Expose()
  @IsOptional()
  @IsString({ message: 'O subtítulo deve ser uma string.' })
  subtitle?: string;
}
