// institutionMember.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { InstitutionMemberService } from '../institutionMember.service'
import { PrismaService } from '../../../database/prisma.service'
import { MediaService } from '../../media-attachment/media-attachment.service'
import { InstitutionMemberType } from '@prisma/client'
import { NotFoundException } from '@nestjs/common'
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest'

describe('InstitutionMemberService', () => {
  let service: InstitutionMemberService
  let prismaService: PrismaService
  let mediaService: MediaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionMemberService,
        {
          provide: PrismaService,
          useValue: {
            institutionMember: {
              create: vi.fn(),
              findMany: vi.fn(),
              findUnique: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            },
          },
        },
        {
          provide: MediaService,
          useValue: {
            processMedia: vi.fn(),
            getMediaAttachmentById: vi.fn(),
            deleteMediaAttachment: vi.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<InstitutionMemberService>(InstitutionMemberService)
    prismaService = module.get<PrismaService>(PrismaService)
    mediaService = module.get<MediaService>(MediaService)
  })

  describe('createInstitutionMember', () => {
    it('should create an institution member with media', async () => {
      const data = {
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        file: {} as Express.Multer.File,
      }

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
      }

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
      }

      const createdMember = {
        id: 1,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'media-id',
      }

      vi.spyOn(mediaService, 'processMedia').mockResolvedValue(mediaResult)
      vi.spyOn(mediaService, 'getMediaAttachmentById').mockResolvedValue(
        mediaResponse,
      )
      vi.spyOn(prismaService.institutionMember, 'create').mockResolvedValue(
        createdMember,
      )

      const result = await service.createInstitutionMember(data)

      expect(mediaService.processMedia).toHaveBeenCalledWith(data.file, {
        accountId: data.institutionId,
      })

      expect(prismaService.institutionMember.create).toHaveBeenCalledWith({
        data: {
          name: data.name,
          institutionId: data.institutionId,
          memberType: data.memberType,
          avatarId: 'media-id',
        },
        select: {
          id: true,
          name: true,
          memberType: true,
          media: true,
          institutionId: true,
        },
      })
      expect(result).toEqual({
        ...createdMember,
      })
    })

    it('should create an institution member without media', async () => {
      const data = {
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
      }

      const createdMember = {
        id: 1,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: null,
      }

      vi.spyOn(prismaService.institutionMember, 'create').mockResolvedValue(
        createdMember,
      )

      const result = await service.createInstitutionMember(data)

      expect(mediaService.processMedia).not.toHaveBeenCalled()
      expect(mediaService.getMediaAttachmentById).not.toHaveBeenCalled()
      expect(prismaService.institutionMember.create).toHaveBeenCalledWith({
        data: {
          name: data.name,
          institutionId: data.institutionId,
          memberType: data.memberType,
          avatarId: null,
        },
        select: {
          id: true,
          name: true,
          memberType: true,
          media: true,
          institutionId: true,
        },
      })
      expect(result).toEqual({
        ...createdMember,
      })
    })
  })

  describe('getInstitutionMembersByType', () => {
    it('should return members with media', async () => {
      const institutionId = 1
      const memberType = InstitutionMemberType.COLLABORATOR

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
      ]

      vi.spyOn(prismaService.institutionMember, 'findMany').mockResolvedValue(
        members,
      )

      const result = await service.getInstitutionMembersByType(
        institutionId,
        memberType,
      )

      expect(prismaService.institutionMember.findMany).toHaveBeenCalledWith({
        where: {
          institutionId,
          memberType,
        },
        select: {
          id: true,
          name: true,
          memberType: true,
          media: true,
          institutionId: true,
        },
      })

      expect(result).toEqual(members)
    })
  })

  describe('findInstitutionMemberById', () => {
    it('should return the member with media', async () => {
      const memberId = 1
      const member = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'media-id',
      }
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
      }

      vi.spyOn(prismaService.institutionMember, 'findUnique').mockResolvedValue(
        member,
      )
      vi.spyOn(mediaService, 'getMediaAttachmentById').mockResolvedValue(
        mediaResponse,
      )

      const result = await service.findInstitutionMemberById(memberId)

      expect(prismaService.institutionMember.findUnique).toHaveBeenCalledWith({
        where: { id: memberId },
        select: {
          id: true,
          name: true,
          memberType: true,
          media: true,
          institutionId: true,
        },
      })

      expect(result).toEqual({
        ...member,
      })
    })

    it('should return the member without media if no avatarId', async () => {
      const memberId = 1
      const member = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: null,
      }

      vi.spyOn(prismaService.institutionMember, 'findUnique').mockResolvedValue(
        member,
      )

      const result = await service.findInstitutionMemberById(memberId)

      expect(prismaService.institutionMember.findUnique).toHaveBeenCalledWith({
        where: { id: memberId },
        select: {
          id: true,
          name: true,
          memberType: true,
          media: true,
          institutionId: true,
        },
      })

      expect(result).toEqual({
        ...member,
      })
    })
  })

  describe('updateInstitutionMember', () => {
    it('should update the member with new media', async () => {
      const memberId = 1
      const data = {
        name: 'Updated Name',
        memberType: InstitutionMemberType.VOLUNTEER,
        file: {} as Express.Multer.File,
      }

      const existingMember = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        media: {
          id: 'old-media-id',
          statusId: BigInt(1),
          fileFileName: 'DeWatermark.ai_1731156953652.png',
          fileContentType: 'image/png',
          fileFileSize: 789337,
          fileUpdatedAt: null,
          remoteUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-12-29T18:32:38.158Z'),
          updatedAt: new Date('2024-12-29T18:32:38.158Z'),
          shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
          type: 1,
          fileMeta: {
            focus: {
              x: 0,
              y: 0,
            },
            original: {
              size: '800x1200',
              width: 800,
              aspect: 0.6666666666666666,
              height: 1200,
            },
          },
          accountId: 8,
          description: 'Media description',
          scheduledStatusId: null,
          blurhash: 'blurhash-string',
          processing: 2,
          fileStorageSchemaVersion: 1,
          thumbnailFileName: null,
          thumbnailContentType: null,
          thumbnailFileSize: null,
          thumbnailUpdatedAt: null,
          thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
        },
      }

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
      }

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
      }

      const updatedMember = {
        id: memberId,
        name: 'Updated Name',
        institutionId: 1,
        memberType: InstitutionMemberType.VOLUNTEER,
        avatarId: 'new-media-id',
      }

      vi.spyOn(service, 'findInstitutionMemberById').mockResolvedValue(
        existingMember,
      )
      vi.spyOn(mediaService, 'deleteMediaAttachment').mockResolvedValue(
        undefined,
      )
      vi.spyOn(mediaService, 'processMedia').mockResolvedValue(mediaResult)
      vi.spyOn(mediaService, 'getMediaAttachmentById').mockResolvedValue(
        mediaResponse,
      )
      vi.spyOn(prismaService.institutionMember, 'update').mockResolvedValue(
        updatedMember,
      )

      const result = await service.updateInstitutionMember(memberId, data)

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId)
      expect(mediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'old-media-id',
      )
      expect(mediaService.processMedia).toHaveBeenCalledWith(data.file, {
        accountId: existingMember.institutionId,
      })
      expect(prismaService.institutionMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: {
          name: data.name,
          memberType: data.memberType,
          avatarId: 'new-media-id',
        },
        select: {
          id: true,
          name: true,
          memberType: true,
          media: true,
          institutionId: true,
        },
      })
      expect(result).toEqual({
        ...updatedMember,
      })
    })

    it('should update the member without changing media', async () => {
      const memberId = 1
      const data = {
        name: 'Updated Name',
      }

      const existingMember = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'media-id',
        media: {
          id: 'media-id',
          statusId: BigInt(1),
          fileFileName: 'DeWatermark.ai_1731156953652.png',
          fileContentType: 'image/png',
          fileFileSize: 789337,
          fileUpdatedAt: null,
          remoteUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-12-29T18:32:38.158Z'),
          updatedAt: new Date('2024-12-29T18:32:38.158Z'),
          shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
          type: 1,
          fileMeta: {
            focus: {
              x: 0,
              y: 0,
            },
            original: {
              size: '800x1200',
              width: 800,
              aspect: 0.6666666666666666,
              height: 1200,
            },
          },
          accountId: 8,
          description: 'Media description',
          scheduledStatusId: null,
          blurhash: 'blurhash-string',
          processing: 2,
          fileStorageSchemaVersion: 1,
          thumbnailFileName: null,
          thumbnailContentType: null,
          thumbnailFileSize: null,
          thumbnailUpdatedAt: null,
          thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
        },
      }

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
      }

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
      }

      vi.spyOn(service, 'findInstitutionMemberById').mockResolvedValue(
        existingMember,
      )
      vi.spyOn(prismaService.institutionMember, 'update').mockResolvedValue(
        updatedMember,
      )
      vi.spyOn(mediaService, 'getMediaAttachmentById').mockResolvedValue(
        mediaResponse,
      )

      const result = await service.updateInstitutionMember(memberId, data)

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId)
      expect(mediaService.deleteMediaAttachment).not.toHaveBeenCalled()
      expect(mediaService.processMedia).not.toHaveBeenCalled()
      expect(prismaService.institutionMember.update).toHaveBeenCalledWith({
        where: { id: memberId },
        data: {
          name: data.name,
          memberType: undefined,
          avatarId: 'media-id',
        },
        select: {
          id: true,
          name: true,
          memberType: true,
          media: true,
          institutionId: true,
        },
      })
      expect(result).toEqual({
        ...updatedMember,
      })
    })

    it('should throw NotFoundException if member not found', async () => {
      const memberId = 1
      const data = {
        name: 'Updated Name',
      }

      vi.spyOn(service, 'findInstitutionMemberById').mockResolvedValue(null)

      await expect(
        service.updateInstitutionMember(memberId, data),
      ).rejects.toThrow(new NotFoundException('Membro não encontrado'))

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId)
    })
  })

  describe('deleteInstitutionMember', () => {
    it('should delete the member with media', async () => {
      const memberId = 1
      const existingMember = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'media-id',
        media: {
          id: 'old-media-id',
          statusId: BigInt(1),
          fileFileName: 'DeWatermark.ai_1731156953652.png',
          fileContentType: 'image/png',
          fileFileSize: 789337,
          fileUpdatedAt: null,
          remoteUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-12-29T18:32:38.158Z'),
          updatedAt: new Date('2024-12-29T18:32:38.158Z'),
          shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
          type: 1,
          fileMeta: {
            focus: {
              x: 0,
              y: 0,
            },
            original: {
              size: '800x1200',
              width: 800,
              aspect: 0.6666666666666666,
              height: 1200,
            },
          },
          accountId: 8,
          description: 'Media description',
          scheduledStatusId: null,
          blurhash: 'blurhash-string',
          processing: 2,
          fileStorageSchemaVersion: 1,
          thumbnailFileName: null,
          thumbnailContentType: null,
          thumbnailFileSize: null,
          thumbnailUpdatedAt: null,
          thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
        },
      }

      vi.spyOn(service, 'findInstitutionMemberById').mockResolvedValue(
        existingMember,
      )
      vi.spyOn(mediaService, 'deleteMediaAttachment').mockResolvedValue(
        undefined,
      )
      vi.spyOn(prismaService.institutionMember, 'delete').mockResolvedValue(
        existingMember,
      )

      const result = await service.deleteInstitutionMember(memberId)

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId)
      expect(mediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'old-media-id',
      )
      expect(prismaService.institutionMember.delete).toHaveBeenCalledWith({
        where: { id: memberId },
      })
      expect(result).toEqual({ message: 'Membro deletado com sucesso' })
    })

    it('should delete the member without media', async () => {
      const memberId = 1
      const existingMember = {
        id: memberId,
        name: 'John Doe',
        institutionId: 1,
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: null,
        media: null,
      }

      vi.spyOn(service, 'findInstitutionMemberById').mockResolvedValue(
        existingMember,
      )
      vi.spyOn(prismaService.institutionMember, 'delete').mockResolvedValue(
        existingMember,
      )

      const result = await service.deleteInstitutionMember(memberId)

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId)
      expect(mediaService.deleteMediaAttachment).not.toHaveBeenCalled()
      expect(prismaService.institutionMember.delete).toHaveBeenCalledWith({
        where: { id: memberId },
      })
      expect(result).toEqual({ message: 'Membro deletado com sucesso' })
    })

    it('should throw NotFoundException if member not found', async () => {
      const memberId = 1

      vi.spyOn(service, 'findInstitutionMemberById').mockResolvedValue(null)

      await expect(service.deleteInstitutionMember(memberId)).rejects.toThrow(
        new NotFoundException('Membro não encontrado'),
      )

      expect(service.findInstitutionMemberById).toHaveBeenCalledWith(memberId)
      expect(prismaService.institutionMember.delete).not.toHaveBeenCalled()
    })
  })
})
