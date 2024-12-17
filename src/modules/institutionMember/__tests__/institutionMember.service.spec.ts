// institutionMember.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionMemberService } from '../institutionMember.service';
import { PrismaService } from '../../../database/prisma.service';
import { MediaService } from '../../media-attachment/media-attachment.service';
import { InstitutionMemberType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('InstitutionMemberService', () => {
  let service: InstitutionMemberService;
  let prismaService: PrismaService;
  let mediaService: MediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionMemberService,
        {
          provide: PrismaService,
          useValue: {
            institutionMember: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: MediaService,
          useValue: {
            processMedia: jest.fn(),
            getMediaAttachmentById: jest.fn(),
            deleteMediaAttachment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InstitutionMemberService>(InstitutionMemberService);
    prismaService = module.get<PrismaService>(PrismaService);
    mediaService = module.get<MediaService>(MediaService);
  });

  describe('createInstitutionMember', () => {
    it('should create an institution member with media', async () => {
      const data = {
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        file: {} as Express.Multer.File,
      };

      const mediaResult = {
        isSynchronous: true,
        mediaAttachment: {
          id: 'media-id',
          type: 'image',
          url: 'http://example.com/media.jpg',
          preview_url: 'http://example.com/preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: '',
          blurhash: '',
        },
      };

      const mediaResponse = {
        mediaResponse: {
          id: 'media-id',
          type: 'image',
          url: 'http://example.com/media.jpg',
          preview_url: 'http://example.com/preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: '',
          blurhash: '',
        },
        processing: 2,
      };

      const createdMember = {
        id: 1,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'media-id',
      };

      jest.spyOn(mediaService, 'processMedia').mockResolvedValue(mediaResult);
      jest
        .spyOn(mediaService, 'getMediaAttachmentById')
        .mockResolvedValue(mediaResponse);
      jest
        .spyOn(prismaService.institutionMember, 'create')
        .mockResolvedValue(createdMember);

      const result = await service.createInstitutionMember(data);

      expect(mediaService.processMedia).toHaveBeenCalledWith(data.file, {
        accountId: data.institutionId,
      });
      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'media-id',
      );
      expect(prismaService.institutionMember.create).toHaveBeenCalledWith({
        data: {
          name: data.name,
          institutionId: data.institutionId,
          memberType: data.memberType,
          avatarId: 'media-id',
        },
      });
      expect(result).toEqual({
        ...createdMember,
        media: mediaResponse,
      });
    });

    it('should create an institution member without media', async () => {
      const data = {
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
      };

      const createdMember = {
        id: 1,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: null,
      };

      jest
        .spyOn(prismaService.institutionMember, 'create')
        .mockResolvedValue(createdMember);

      const result = await service.createInstitutionMember(data);

      expect(mediaService.processMedia).not.toHaveBeenCalled();
      expect(mediaService.getMediaAttachmentById).not.toHaveBeenCalled();
      expect(prismaService.institutionMember.create).toHaveBeenCalledWith({
        data: {
          name: data.name,
          institutionId: data.institutionId,
          memberType: data.memberType,
          avatarId: null,
        },
      });
      expect(result).toEqual({
        ...createdMember,
        media: null,
      });
    });
  });

  describe('getInstitutionMembersByType', () => {
    it('should return members with media', async () => {
      const institutionId = 1;
      const memberType = InstitutionMemberType.COLLABORATOR;

      const members = [
        {
          id: 1,
          name: 'John Doe',
          institutionId,
          memberType,
          avatarId: 'media-id-1',
        },
        {
          id: 2,
          name: 'Jane Smith',
          institutionId,
          memberType,
          avatarId: null,
        },
      ];

      const mediaResponse = {
        mediaResponse: {
          id: 'media-id',
          type: 'image',
          url: 'http://example.com/media.jpg',
          preview_url: 'http://example.com/preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: '',
          blurhash: '',
        },
        processing: 2,
      };

      jest
        .spyOn(prismaService.institutionMember, 'findMany')
        .mockResolvedValue(members);
      jest
        .spyOn(mediaService, 'getMediaAttachmentById')
        .mockResolvedValue(mediaResponse);

      const result = await service.getInstitutionMembersByType(
        institutionId,
        memberType,
      );

      expect(prismaService.institutionMember.findMany).toHaveBeenCalledWith({
        where: {
          institutionId,
          memberType,
        },
      });

      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'media-id-1',
      );

      expect(result).toEqual([
        {
          ...members[0],
          media: mediaResponse,
        },
        {
          ...members[1],
          media: null,
        },
      ]);
    });
  });

  describe('findInstitutionMemberById', () => {
    it('should return the member with media', async () => {
      const memberId = 1;
      const member = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'media-id',
      };
      const mediaResponse = {
        mediaResponse: {
          id: 'media-id',
          type: 'image',
          url: 'http://example.com/media.jpg',
          preview_url: 'http://example.com/preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: '',
          blurhash: '',
        },
        processing: 2,
      };

      jest
        .spyOn(prismaService.institutionMember, 'findUnique')
        .mockResolvedValue(member);
      jest
        .spyOn(mediaService, 'getMediaAttachmentById')
        .mockResolvedValue(mediaResponse);

      const result = await service.findInstitutionMemberById(memberId);

      expect(prismaService.institutionMember.findUnique).toHaveBeenCalledWith({
        where: { id: memberId },
      });
      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'media-id',
      );

      expect(result).toEqual({
        ...member,
        media: mediaResponse,
      });
    });

    it('should return the member without media if no avatarId', async () => {
      const memberId = 1;
      const member = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: null,
      };

      jest
        .spyOn(prismaService.institutionMember, 'findUnique')
        .mockResolvedValue(member);

      const result = await service.findInstitutionMemberById(memberId);

      expect(prismaService.institutionMember.findUnique).toHaveBeenCalledWith({
        where: { id: memberId },
      });
      expect(mediaService.getMediaAttachmentById).not.toHaveBeenCalled();

      expect(result).toEqual({
        ...member,
        media: null,
      });
    });
  });

  describe('updateInstitutionMember', () => {
    it('should update the member with new media', async () => {
      const memberId = 1;
      const data = {
        name: 'Updated Name',
        memberType: InstitutionMemberType.VOLUNTEER,
        file: {} as Express.Multer.File,
      };

      const existingMember = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'old-media-id',
        media: null,
      };

      const mediaResult = {
        isSynchronous: true,
        mediaAttachment: {
          id: 'new-media-id',
          type: 'image',
          url: 'http://example.com/media.jpg',
          preview_url: 'http://example.com/preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: '',
          blurhash: '',
        },
      };

      const mediaResponse = {
        mediaResponse: {
          id: 'media-id',
          type: 'image',
          url: 'http://example.com/media.jpg',
          preview_url: 'http://example.com/preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: '',
          blurhash: '',
        },
        processing: 2,
      };

      const updatedMember = {
        id: memberId,
        name: 'Updated Name',
        institutionId: 1,
        memberType: InstitutionMemberType.VOLUNTEER,
        avatarId: 'new-media-id',
      };

      jest
        .spyOn(service, 'findInstitutionMemberById')
        .mockResolvedValue(existingMember);
      jest
        .spyOn(mediaService, 'deleteMediaAttachment')
        .mockResolvedValue(undefined);
      jest.spyOn(mediaService, 'processMedia').mockResolvedValue(mediaResult);
      jest
        .spyOn(mediaService, 'getMediaAttachmentById')
        .mockResolvedValue(mediaResponse);
      jest
        .spyOn(prismaService.institutionMember, 'update')
        .mockResolvedValue(updatedMember);

      const result = await service.updateInstitutionMember(memberId, data);

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId);
      expect(mediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'old-media-id',
      );
      expect(mediaService.processMedia).toHaveBeenCalledWith(data.file, {
        accountId: existingMember.institutionId,
      });
      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'new-media-id',
      );
      expect(prismaService.institutionMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: {
          name: data.name,
          memberType: data.memberType,
          avatarId: 'new-media-id',
        },
      });
      expect(result).toEqual({
        ...updatedMember,
        media: mediaResponse,
      });
    });

    it('should update the member without changing media', async () => {
      const memberId = 1;
      const data = {
        name: 'Updated Name',
      };

      const existingMember = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'media-id',
        media: {
          mediaResponse: {
            id: 'media-id',
            type: 'image',
            url: 'http://example.com/media.jpg',
            preview_url: 'http://example.com/preview.jpg',
            remote_url: null,
            text_url: null,
            meta: null,
            description: '',
            blurhash: '',
          },
          processing: 2,
        },
      };

      const updatedMember = {
        id: memberId,
        name: 'Updated Name',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'media-id',
        media: {
          mediaResponse: {
            id: 'media-id',
            type: 'image',
            url: 'http://example.com/media.jpg',
            preview_url: 'http://example.com/preview.jpg',
            remote_url: null,
            text_url: null,
            meta: null,
            description: '',
            blurhash: '',
          },
          processing: 2,
        },
      };

      const mediaResponse = {
        mediaResponse: {
          id: 'media-id',
          type: 'image',
          url: 'http://example.com/media.jpg',
          preview_url: 'http://example.com/preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: '',
          blurhash: '',
        },
        processing: 2,
      };

      jest
        .spyOn(service, 'findInstitutionMemberById')
        .mockResolvedValue(existingMember);
      jest
        .spyOn(prismaService.institutionMember, 'update')
        .mockResolvedValue(updatedMember);
      jest
        .spyOn(mediaService, 'getMediaAttachmentById')
        .mockResolvedValue(mediaResponse);

      const result = await service.updateInstitutionMember(memberId, data);

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId);
      expect(mediaService.deleteMediaAttachment).not.toHaveBeenCalled();
      expect(mediaService.processMedia).not.toHaveBeenCalled();
      expect(prismaService.institutionMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: {
          name: data.name,
          memberType: undefined,
          avatarId: 'media-id',
        },
      });
      expect(result).toEqual({
        ...updatedMember,
        media: mediaResponse,
      });
    });

    it('should throw NotFoundException if member not found', async () => {
      const memberId = 1;
      const data = {
        name: 'Updated Name',
      };

      jest.spyOn(service, 'findInstitutionMemberById').mockResolvedValue(null);

      await expect(
        service.updateInstitutionMember(memberId, data),
      ).rejects.toThrow(new NotFoundException('Membro não encontrado'));

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId);
    });
  });

  describe('deleteInstitutionMember', () => {
    it('should delete the member with media', async () => {
      const memberId = 1;
      const existingMember = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'media-id',
        media: null,
      };

      jest
        .spyOn(service, 'findInstitutionMemberById')
        .mockResolvedValue(existingMember);
      jest
        .spyOn(mediaService, 'deleteMediaAttachment')
        .mockResolvedValue(undefined);
      jest
        .spyOn(prismaService.institutionMember, 'delete')
        .mockResolvedValue(existingMember);

      const result = await service.deleteInstitutionMember(memberId);

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId);
      expect(mediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'media-id',
      );
      expect(prismaService.institutionMember.delete).toHaveBeenCalledWith({
        where: { id: memberId },
      });
      expect(result).toEqual({ message: 'Membro deletado com sucesso' });
    });

    it('should delete the member without media', async () => {
      const memberId = 1;
      const existingMember = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: null,
        media: null,
      };

      jest
        .spyOn(service, 'findInstitutionMemberById')
        .mockResolvedValue(existingMember);
      jest
        .spyOn(prismaService.institutionMember, 'delete')
        .mockResolvedValue(existingMember);

      const result = await service.deleteInstitutionMember(memberId);

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId);
      expect(mediaService.deleteMediaAttachment).not.toHaveBeenCalled();
      expect(prismaService.institutionMember.delete).toHaveBeenCalledWith({
        where: { id: memberId },
      });
      expect(result).toEqual({ message: 'Membro deletado com sucesso' });
    });

    it('should throw NotFoundException if member not found', async () => {
      const memberId = 1;

      jest.spyOn(service, 'findInstitutionMemberById').mockResolvedValue(null);

      await expect(service.deleteInstitutionMember(memberId)).rejects.toThrow(
        new NotFoundException('Membro não encontrado'),
      );

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId);
      expect(prismaService.institutionMember.delete).not.toHaveBeenCalled();
    });
  });
});
