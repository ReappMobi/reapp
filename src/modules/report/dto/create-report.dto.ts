import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator'

export class CreateReportDto {
  @IsIn(['POST', 'COMMENT', 'ACCOUNT'])
  targetType: string

  @IsInt()
  targetId: number

  @IsString()
  @IsNotEmpty()
  reason: string
}
