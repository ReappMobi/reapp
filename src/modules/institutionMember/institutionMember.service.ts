import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { MediaService } from '../media-attachment/media-attachment.service'
import { InstitutionMemberType } from '@prisma/client'

const institutionMemberResponseFields = {
  id: true,
  name: true,
  memberType: true,
  media: true,
  institutionId: true,
}

@Injectable()
export class InstitutionMemberService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async createInstitutionMember(data: {
    name: string
    institutionId: number
    memberType: InstitutionMemberType
    file?: Express.Multer.File
  }) {
    const { name, institutionId, memberType, file } = data

    let avatarId: string | null = null

    if (file) {
      const mediaResult = await this.mediaService.processMedia(file, {
        accountId: institutionId,
      })

      avatarId = mediaResult.mediaAttachment.id
    }

    const member = await this.prismaService.institutionMember.create({
      data: {
        name,
        institutionId,
        memberType,
        avatarId,
      },
      select: institutionMemberResponseFields,
    })

    return member
  }

  async getInstitutionMembersByType(
    institutionId: number,
    memberType: InstitutionMemberType,
  ) {
    const members = await this.prismaService.institutionMember.findMany({
      where: {
        institutionId,
        memberType,
      },
      select: institutionMemberResponseFields,
    })

    return members
  }

  async deleteInstitutionMember(memberId: number) {
    const member = await this.findInstitutionMemberById(memberId)

    if (!member) {
      throw new NotFoundException('Membro não encontrado')
    }

    if (member.media?.id) {
      await this.mediaService.deleteMediaAttachment(member.media.id)
    }

    await this.prismaService.institutionMember.delete({
      where: { id: memberId },
    })

    return { message: 'Membro deletado com sucesso' }
  }

  async findInstitutionMemberById(memberId: number) {
    const member = await this.prismaService.institutionMember.findUnique({
      where: { id: memberId },
      select: institutionMemberResponseFields,
    })

    return member
  }

  async updateInstitutionMember(
    memberId: number,
    data: {
      name?: string
      memberType?: InstitutionMemberType
      file?: Express.Multer.File
    },
  ) {
    const { name, memberType, file } = data

    const existingMember = await this.findInstitutionMemberById(memberId)

    if (!existingMember) {
      throw new NotFoundException('Membro não encontrado')
    }

    let avatarId = existingMember.media?.id

    if (file) {
      if (avatarId) {
        await this.mediaService.deleteMediaAttachment(avatarId)
      }
      const mediaResult = await this.mediaService.processMedia(file, {
        accountId: existingMember.institutionId,
      })
      avatarId = mediaResult.mediaAttachment.id
    }

    const updatedMember = await this.prismaService.institutionMember.update({
      where: { id: memberId },
      data: {
        name,
        memberType,
        avatarId,
      },
      select: institutionMemberResponseFields,
    })

    return updatedMember
  }
}
