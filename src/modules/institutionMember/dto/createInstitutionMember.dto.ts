import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { InstitutionMemberType } from '@prisma/client';

export class CreateInstitutionMemberDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(InstitutionMemberType)
  @IsNotEmpty()
  memberType: InstitutionMemberType;
}
