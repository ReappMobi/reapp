// institutionMember.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { InstitutionMemberController } from '../institutionMember.controller'
import { InstitutionMemberService } from '../institutionMember.service'
import { AccountService } from '../../account/account.service'
import { AuthGuard } from '../../auth/auth.guard'
import { UnauthorizedException } from '@nestjs/common'
import { CreateInstitutionMemberDto } from '../dto/createInstitutionMember.dto'
import { UpdateInstitutionMemberDto } from '../dto/updateInstitutionMember.dto'
import { InstitutionMemberType } from '@prisma/client'

describe('InstitutionMemberController', () => {
  let controller: InstitutionMemberController
  let institutionMemberService: InstitutionMemberService
  let accountService: AccountService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionMemberController],
      providers: [
        {
          provide: InstitutionMemberService,
          useValue: {
            createInstitutionMember: jest.fn(),
            getInstitutionMembersByType: jest.fn(),
            findInstitutionMemberById: jest.fn(),
            updateInstitutionMember: jest.fn(),
            deleteInstitutionMember: jest.fn(),
          },
        },
        {
          provide: AccountService,
          useValue: {
            findOneInstitution: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile()

    controller = module.get<InstitutionMemberController>(
      InstitutionMemberController,
    )
    institutionMemberService = module.get<InstitutionMemberService>(
      InstitutionMemberService,
    )
    accountService = module.get<AccountService>(AccountService)
  })

  describe('createInstitutionMember', () => {
    it('should create an institution member', async () => {
      const createMemberDto: CreateInstitutionMemberDto = {
        name: 'John Doe',
        memberType: InstitutionMemberType.COLLABORATOR,
      }
      const file = {} as Express.Multer.File
      const request = { user: { id: 1 } } as any

      const accountId = 1
      const institution = {
        id: 1,
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 0,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      }
      const createdMember = {
        id: 1,
        name: 'John Doe',
        memberType: InstitutionMemberType.COLLABORATOR,
        institutionId: 1,
        avatarId: 'avatar-id',
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

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution)
      jest
        .spyOn(institutionMemberService, 'createInstitutionMember')
        .mockResolvedValue(createdMember)

      const result = await controller.createInstitutionMember(
        request,
        createMemberDto,
        file,
      )

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.createInstitutionMember,
      ).toHaveBeenCalledWith({
        ...createMemberDto,
        institutionId: 1,
        file,
      })
      expect(result).toEqual(createdMember)
    })

    it('should throw UnauthorizedException if institution not found', async () => {
      const createMemberDto: CreateInstitutionMemberDto = {
        name: 'John Doe',
        memberType: InstitutionMemberType.COLLABORATOR,
      }
      const file = {} as Express.Multer.File
      const request = { user: { id: 1 } } as any

      jest.spyOn(accountService, 'findOneInstitution').mockResolvedValue(null)

      await expect(
        controller.createInstitutionMember(request, createMemberDto, file),
      ).rejects.toThrow(new UnauthorizedException('Instituição não encontrada'))

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.createInstitutionMember,
      ).not.toHaveBeenCalled()
    })
  })

  describe('getCollaboratorsByInstitutionId', () => {
    it('should return collaborators for the institution', async () => {
      const institutionId = 1
      const collaborators = [
        {
          id: 1,
          name: 'John Doe',
          memberType: InstitutionMemberType.COLLABORATOR,
          institutionId: 1,
          avatarId: 'avatar-id',
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
        },
      ]

      jest
        .spyOn(institutionMemberService, 'getInstitutionMembersByType')
        .mockResolvedValue(collaborators)

      const result =
        await controller.getCollaboratorsByInstitutionId(institutionId)

      expect(
        institutionMemberService.getInstitutionMembersByType,
      ).toHaveBeenCalledWith(institutionId, InstitutionMemberType.COLLABORATOR)
      expect(result).toEqual(collaborators)
    })
  })

  describe('getVolunteersByInstitutionId', () => {
    it('should return volunteers for the institution', async () => {
      const institutionId = 1
      const volunteers = [
        {
          id: 2,
          name: 'Jane Smith',
          memberType: InstitutionMemberType.VOLUNTEER,
          institutionId: 1,
          avatarId: 'avatar-id-2',
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
        },
      ]

      jest
        .spyOn(institutionMemberService, 'getInstitutionMembersByType')
        .mockResolvedValue(volunteers)

      const result =
        await controller.getVolunteersByInstitutionId(institutionId)

      expect(
        institutionMemberService.getInstitutionMembersByType,
      ).toHaveBeenCalledWith(institutionId, InstitutionMemberType.VOLUNTEER)
      expect(result).toEqual(volunteers)
    })
  })

  describe('getPartnersByInstitutionId', () => {
    it('should return partners for the institution', async () => {
      const institutionId = 1
      const partners = [
        {
          id: 3,
          name: 'Acme Corp',
          memberType: InstitutionMemberType.PARTNER,
          institutionId: 1,
          avatarId: 'avatar-id-3',
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
        },
      ]

      jest
        .spyOn(institutionMemberService, 'getInstitutionMembersByType')
        .mockResolvedValue(partners)

      const result = await controller.getPartnersByInstitutionId(institutionId)

      expect(
        institutionMemberService.getInstitutionMembersByType,
      ).toHaveBeenCalledWith(institutionId, InstitutionMemberType.PARTNER)
      expect(result).toEqual(partners)
    })
  })

  describe('getInstitutionMemberById', () => {
    it('should return the institution member if authorized', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any
      const accountId = 1
      const institution = {
        id: 1,
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      }
      const member = {
        id: memberId,
        institutionId: 1,
        name: 'John Doe',
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'avatar-id',
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

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution)
      jest
        .spyOn(institutionMemberService, 'findInstitutionMemberById')
        .mockResolvedValue(member)

      const result = await controller.getInstitutionMemberById(
        memberId,
        request,
      )

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).toHaveBeenCalledWith(memberId)
      expect(result).toEqual(member)
    })

    it('should throw UnauthorizedException if institution not found', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any

      jest.spyOn(accountService, 'findOneInstitution').mockResolvedValue(null)

      await expect(
        controller.getInstitutionMemberById(memberId, request),
      ).rejects.toThrow(new UnauthorizedException('Instituição não encontrada'))

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException if member not found', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any
      const accountId = 1
      const institution = {
        id: 1,
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      }

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution)
      jest
        .spyOn(institutionMemberService, 'findInstitutionMemberById')
        .mockResolvedValue(null)

      await expect(
        controller.getInstitutionMemberById(memberId, request),
      ).rejects.toThrow(new UnauthorizedException('Membro não encontrado'))

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).toHaveBeenCalledWith(memberId)
    })

    it('should throw UnauthorizedException if access is unauthorized', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any
      const accountId = 1
      const institution = {
        id: 1,
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      }
      const member = {
        id: memberId,
        institutionId: 2,
        name: 'John Doe',
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'avatar-id',
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

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution)
      jest
        .spyOn(institutionMemberService, 'findInstitutionMemberById')
        .mockResolvedValue(member)

      await expect(
        controller.getInstitutionMemberById(memberId, request),
      ).rejects.toThrow(new UnauthorizedException('Acesso não autorizado'))

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).toHaveBeenCalledWith(memberId)
    })
  })

  describe('updateInstitutionMember', () => {
    it('should update the institution member if authorized', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any
      const updateMemberDto: UpdateInstitutionMemberDto = {
        name: 'Updated Name',
        memberType: InstitutionMemberType.VOLUNTEER,
      }
      const file = {} as Express.Multer.File
      const accountId = 1
      const institution = {
        id: 1,
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      }
      const member = {
        id: memberId,
        institutionId: 1,
        name: 'John Doe',
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'avatar-id',
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
        institutionId: 1,
        name: 'Updated Name',
        memberType: InstitutionMemberType.VOLUNTEER,
        avatarId: 'avatar-id',
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

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution)
      jest
        .spyOn(institutionMemberService, 'findInstitutionMemberById')
        .mockResolvedValue(member)
      jest
        .spyOn(institutionMemberService, 'updateInstitutionMember')
        .mockResolvedValue(updatedMember)

      const result = await controller.updateInstitutionMember(
        memberId,
        request,
        updateMemberDto,
        file,
      )

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).toHaveBeenCalledWith(memberId)
      expect(
        institutionMemberService.updateInstitutionMember,
      ).toHaveBeenCalledWith(memberId, {
        ...updateMemberDto,
        file,
      })
      expect(result).toEqual(updatedMember)
    })

    it('should throw UnauthorizedException if institution not found', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any
      const updateMemberDto: UpdateInstitutionMemberDto = {
        name: 'Updated Name',
      }
      const file = {} as Express.Multer.File

      jest.spyOn(accountService, 'findOneInstitution').mockResolvedValue(null)

      await expect(
        controller.updateInstitutionMember(
          memberId,
          request,
          updateMemberDto,
          file,
        ),
      ).rejects.toThrow(new UnauthorizedException('Instituição não encontrada'))

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException if member not found', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any
      const updateMemberDto: UpdateInstitutionMemberDto = {
        name: 'Updated Name',
      }
      const file = {} as Express.Multer.File
      const accountId = 1
      const institution = {
        id: 1,
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      }

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution)
      jest
        .spyOn(institutionMemberService, 'findInstitutionMemberById')
        .mockResolvedValue(null)

      await expect(
        controller.updateInstitutionMember(
          memberId,
          request,
          updateMemberDto,
          file,
        ),
      ).rejects.toThrow(new UnauthorizedException('Membro não encontrado'))

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).toHaveBeenCalledWith(memberId)
      expect(
        institutionMemberService.updateInstitutionMember,
      ).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException if access is unauthorized', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any
      const updateMemberDto: UpdateInstitutionMemberDto = {
        name: 'Updated Name',
      }
      const file = {} as Express.Multer.File
      const accountId = 1
      const institution = {
        id: 1,
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      }
      const member = {
        id: memberId,
        institutionId: 2,
        name: 'John Doe',
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'avatar-id',
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

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution)
      jest
        .spyOn(institutionMemberService, 'findInstitutionMemberById')
        .mockResolvedValue(member)

      await expect(
        controller.updateInstitutionMember(
          memberId,
          request,
          updateMemberDto,
          file,
        ),
      ).rejects.toThrow(new UnauthorizedException('Acesso não autorizado'))

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).toHaveBeenCalledWith(memberId)
      expect(
        institutionMemberService.updateInstitutionMember,
      ).not.toHaveBeenCalled()
    })
  })

  describe('deleteInstitutionMember', () => {
    it('should delete the institution member if authorized', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any
      const accountId = 1
      const institution = {
        id: 1,
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      }
      const member = {
        id: memberId,
        institutionId: 1,
        name: 'John Doe',
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'avatar-id',
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

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution)
      jest
        .spyOn(institutionMemberService, 'findInstitutionMemberById')
        .mockResolvedValue(member)
      jest
        .spyOn(institutionMemberService, 'deleteInstitutionMember')
        .mockResolvedValue({ message: 'Membro deletado com sucesso' })

      const result = await controller.deleteInstitutionMember(memberId, request)

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).toHaveBeenCalledWith(memberId)
      expect(
        institutionMemberService.deleteInstitutionMember,
      ).toHaveBeenCalledWith(memberId)
      expect(result).toEqual({ message: 'Membro deletado com sucesso' })
    })

    it('should throw UnauthorizedException if institution not found', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any

      jest.spyOn(accountService, 'findOneInstitution').mockResolvedValue(null)

      await expect(
        controller.deleteInstitutionMember(memberId, request),
      ).rejects.toThrow(new UnauthorizedException('Instituição não encontrada'))

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException if member not found', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any
      const accountId = 1
      const institution = {
        id: 1,
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      }

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution)
      jest
        .spyOn(institutionMemberService, 'findInstitutionMemberById')
        .mockResolvedValue(null)

      await expect(
        controller.deleteInstitutionMember(memberId, request),
      ).rejects.toThrow(new UnauthorizedException('Membro não encontrado'))

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).toHaveBeenCalledWith(memberId)
      expect(
        institutionMemberService.deleteInstitutionMember,
      ).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException if access is unauthorized', async () => {
      const memberId = 1
      const request = { user: { id: 1 } } as any
      const accountId = 1
      const institution = {
        id: 1,
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      }

      const member = {
        id: memberId,
        institutionId: 2,
        name: 'John Doe',
        memberType: InstitutionMemberType.COLLABORATOR,
        avatarId: 'avatar-id',
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
      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution)
      jest
        .spyOn(institutionMemberService, 'findInstitutionMemberById')
        .mockResolvedValue(member)

      await expect(
        controller.deleteInstitutionMember(memberId, request),
      ).rejects.toThrow(new UnauthorizedException('Acesso não autorizado'))

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(1)
      expect(
        institutionMemberService.findInstitutionMemberById,
      ).toHaveBeenCalledWith(memberId)
      expect(
        institutionMemberService.deleteInstitutionMember,
      ).not.toHaveBeenCalled()
    })
  })
})
