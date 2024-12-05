// update-institution-member.dto.ts
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { InstitutionMemberType } from '@prisma/client';

export class UpdateInstitutionMemberDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(InstitutionMemberType)
  @IsOptional()
  memberType?: InstitutionMemberType;
}
