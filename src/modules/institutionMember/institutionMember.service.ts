import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MediaService } from '../mediaAttachment/media-attachment.service';
import { InstitutionMemberType } from '@prisma/client';

@Injectable()
export class InstitutionMemberService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async createInstitutionMember(data: {
    name: string;
    institutionId: number;
    memberType: InstitutionMemberType;
    file?: Express.Multer.File;
  }) {
    const { name, institutionId, memberType, file } = data;

    let avatarId: string | null = null;
    let media = null;

    if (file) {
      const mediaResult = await this.mediaService.processMedia(file, {
        accountId: institutionId,
      });

      avatarId = mediaResult.mediaAttachment.id;
      media = await this.mediaService.getMediaAttachmentById(avatarId);
    }

    const member = await this.prismaService.institutionMember.create({
      data: {
        name,
        institutionId,
        memberType,
        avatarId,
      },
    });

    return {
      ...member,
      media,
    };
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
    });

    const membersWithMedia = await Promise.all(
      members.map(async (member) => {
        let media = null;
        if (member.avatarId) {
          media = await this.mediaService.getMediaAttachmentById(
            member.avatarId,
          );
        }
        return {
          ...member,
          media,
        };
      }),
    );

    return membersWithMedia;
  }

  async deleteInstitutionMember(memberId: number) {
    const member = await this.findInstitutionMemberById(memberId);

    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    if (member.avatarId) {
      await this.mediaService.deleteMediaAttachment(member.avatarId);
    }

    await this.prismaService.institutionMember.delete({
      where: { id: memberId },
    });

    return { message: 'Membro deletado com sucesso' };
  }

  async findInstitutionMemberById(memberId: number) {
    const member = await this.prismaService.institutionMember.findUnique({
      where: { id: memberId },
    });

    let media = null;

    if (member.avatarId) {
      media = await this.mediaService.getMediaAttachmentById(member.avatarId);
    }

    return {
      ...member,
      media,
    };
  }

  async updateInstitutionMember(
    memberId: number,
    data: {
      name?: string;
      memberType?: InstitutionMemberType;
      file?: Express.Multer.File;
    },
  ) {
    const { name, memberType, file } = data;

    const existingMember = await this.findInstitutionMemberById(memberId);

    if (!existingMember) {
      throw new NotFoundException('Membro não encontrado');
    }

    let avatarId = existingMember.avatarId;
    let media = null;

    if (file) {
      if (avatarId) {
        await this.mediaService.deleteMediaAttachment(avatarId);
      }
      const mediaResult = await this.mediaService.processMedia(file, {
        accountId: existingMember.institutionId,
      });
      avatarId = mediaResult.mediaAttachment.id;
      media = await this.mediaService.getMediaAttachmentById(avatarId);
    } else if (avatarId) {
      media = await this.mediaService.getMediaAttachmentById(avatarId);
    }

    const updatedMember = await this.prismaService.institutionMember.update({
      where: { id: memberId },
      data: {
        name,
        memberType,
        avatarId,
      },
    });

    return {
      ...updatedMember,
      media,
    };
  }
}
