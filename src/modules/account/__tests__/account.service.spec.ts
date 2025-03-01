import { Test, TestingModule } from '@nestjs/testing'
import { AccountService } from '../account.service'
import { PrismaService } from '../../../database/prisma.service'
import {
  CreateAccountDto,
  CreateAccountGoogleDto,
} from '../dto/create-account.dto'
import { AccountType } from '@prisma/client'
import { MediaService } from '../../media-attachment/media-attachment.service'
import { UpdateAccountDto } from '../dto/update-account.dto'

describe('AccountService', () => {
  let service: AccountService
  let prismaService: PrismaService
  let mediaService: MediaService

  const mockPrismaService = {
    account: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    follow: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    institution: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    donor: {
      findUnique: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  }

  const mockMediaService = {
    processMedia: jest.fn(),
    deleteMediaAttachment: jest.fn(),
    getMediaAttachmentById: jest.fn(),
  }

  const mockOAuth2Client = {
    verifyIdToken: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MediaService,
          useValue: mockMediaService,
        },
      ],
    }).compile()

    service = module.get<AccountService>(AccountService)
    prismaService = module.get<PrismaService>(PrismaService)
    mediaService = module.get<MediaService>(MediaService)

    // Sobrescrevendo o OAuth2Client dentro do service manualmente
    // Como o service instancia diretamente o OAuth2Client, podemos fazer:
    // (service as any).client = mockOAuth2Client;
    // Alternativamente, poderíamos ajustar a classe para injetar o client.
    ;(service as any).client = mockOAuth2Client
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('create (INSTITUTION)', () => {
    it('should create institution account', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.INSTITUTION,
        email: 'inst@example.com',
        password: 'password123',
        name: 'Institution Name',
        phone: '+123456789',
        cnpj: '12345678000199',
        category: 'Educação',
      }

      mockPrismaService.account.findFirst.mockResolvedValue(null) // email não existe
      mockPrismaService.institution.findFirst.mockResolvedValue(null) // cnpj não existe
      mockPrismaService.category.findFirst.mockResolvedValue(null)
      mockPrismaService.category.create.mockResolvedValue({
        id: 1,
        name: 'Educação',
      })
      mockPrismaService.account.create.mockResolvedValue({
        id: 1,
        email: createAccountDto.email,
        name: createAccountDto.name,
        accountType: AccountType.INSTITUTION,
        institution: {
          cnpj: createAccountDto.cnpj,
          phone: createAccountDto.phone,
          category: { name: 'Educação' },
        },
        avatarId: null,
        media: null,
      })

      const result = await service.create(createAccountDto)
      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
        where: { email: createAccountDto.email },
      })
      expect(prismaService.institution.findFirst).toHaveBeenCalledWith({
        where: { cnpj: createAccountDto.cnpj },
      })
      expect(result).toHaveProperty('id', 1)
      expect(result.institution.cnpj).toBe(createAccountDto.cnpj)
    })

    it('should throw if email already exists', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.INSTITUTION,
        email: 'inst@example.com',
        password: 'password123',
        name: 'Institution Name',
        phone: '+123456789',
        cnpj: '12345678000199',
        category: 'Educação',
      }

      mockPrismaService.account.findFirst.mockResolvedValue({
        id: 1,
        email: createAccountDto.email,
      })

      await expect(service.create(createAccountDto)).rejects.toThrow(
        'este email já está cadastrado',
      )
    })

    it('should throw if cnpj already exists', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.INSTITUTION,
        email: 'new@example.com',
        password: 'password123',
        name: 'New Inst',
        phone: '+123456789',
        cnpj: '12345678000199',
        category: 'Educação',
      }

      mockPrismaService.account.findFirst.mockResolvedValue(null)
      mockPrismaService.institution.findFirst.mockResolvedValue({
        id: 99,
        cnpj: createAccountDto.cnpj,
      })

      await expect(service.create(createAccountDto)).rejects.toThrow(
        'este cnpj já está cadastrado',
      )
    })
  })

  describe('AccountService - Follow/Unfollow', () => {
    describe('followAccount', () => {
      it('should follow an account successfully', async () => {
        mockPrismaService.follow.findFirst.mockResolvedValue(null) // Não há registro existente
        mockPrismaService.account.findFirst.mockResolvedValueOnce({ id: 2 }) // Conta a ser seguida existe
        mockPrismaService.account.findFirst.mockResolvedValueOnce({ id: 1 }) // Conta do seguidor existe
        mockPrismaService.account.update.mockResolvedValue(undefined) // Incremento de contadores
        mockPrismaService.follow.create.mockResolvedValue({
          id: 1,
          followerId: 1,
          followingId: 2,
        }) // Criação do registro de follow

        const result = await service.followAccount(1, 2)

        expect(mockPrismaService.follow.findFirst).toHaveBeenCalledWith({
          where: { followerId: 1, followingId: 2 },
        })
        expect(mockPrismaService.account.update).toHaveBeenCalledTimes(2)
        expect(mockPrismaService.follow.create).toHaveBeenCalledWith({
          data: { followerId: 1, followingId: 2 },
        })
        expect(result).toEqual({ id: 1, followerId: 1, followingId: 2 })
      })

      it('should throw an error if the user already follows the account', async () => {
        mockPrismaService.follow.findFirst.mockResolvedValue({ id: 1 })

        await expect(service.followAccount(1, 2)).rejects.toThrow(
          'O usuário já segue essa conta',
        )
        expect(mockPrismaService.follow.findFirst).toHaveBeenCalledWith({
          where: { followerId: 1, followingId: 2 },
        })
      })

      it('should throw an error if the following account does not exist', async () => {
        mockPrismaService.follow.findFirst.mockResolvedValue(null)
        mockPrismaService.account.findFirst.mockResolvedValueOnce(null) // Conta a ser seguida não existe

        await expect(service.followAccount(1, 2)).rejects.toThrow(
          'Conta com ID 1 não encontrada',
        )
        expect(mockPrismaService.account.findFirst).toHaveBeenCalledWith({
          where: { id: 2 },
        })
      })

      it('should throw an error if the follower account does not exist', async () => {
        mockPrismaService.follow.findFirst.mockResolvedValue(null)
        mockPrismaService.account.findFirst
          .mockResolvedValueOnce({ id: 2 }) // Conta a ser seguida existe
          .mockResolvedValueOnce(null) // Conta do seguidor não existe

        await expect(service.followAccount(1, 2)).rejects.toThrow(
          'Conta com ID 1 não encontrada',
        )
        expect(mockPrismaService.account.findFirst).toHaveBeenCalledTimes(2)
      })
    })

    describe('unfollowAccount', () => {
      it('should unfollow an account successfully', async () => {
        mockPrismaService.follow.findFirst.mockResolvedValue({
          id: 1,
          followerId: 1,
          followingId: 2,
        }) // Existe registro de follow
        mockPrismaService.account.findFirst
          .mockResolvedValueOnce({ id: 2 }) // Conta a ser deixada de seguir existe
          .mockResolvedValueOnce({ id: 1 }) // Conta do seguidor existe
        mockPrismaService.account.update.mockResolvedValue(undefined) // Decremento de contadores
        mockPrismaService.follow.delete.mockResolvedValue({
          id: 1,
          followerId: 1,
          followingId: 2,
        }) // Remoção do registro de follow

        const result = await service.unfollowAccount(1, 2)

        expect(mockPrismaService.follow.findFirst).toHaveBeenCalledWith({
          where: { followerId: 1, followingId: 2 },
        })
        expect(mockPrismaService.account.update).toHaveBeenCalledTimes(2)
        expect(mockPrismaService.follow.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        })
        expect(result).toEqual({ id: 1, followerId: 1, followingId: 2 })
      })

      it('should throw an error if there is no follow record', async () => {
        mockPrismaService.follow.findFirst.mockResolvedValue(null)

        await expect(service.unfollowAccount(1, 2)).rejects.toThrow(
          'O usuário já segue essa conta',
        )
        expect(mockPrismaService.follow.findFirst).toHaveBeenCalledWith({
          where: { followerId: 1, followingId: 2 },
        })
      })

      it('should throw an error if the following account does not exist', async () => {
        mockPrismaService.follow.findFirst.mockResolvedValue({
          id: 1,
          followerId: 1,
          followingId: 2,
        })
        mockPrismaService.account.findFirst.mockResolvedValueOnce(null) // Conta a ser deixada de seguir não existe

        await expect(service.unfollowAccount(1, 2)).rejects.toThrow(
          'Conta com ID 1 não encontrada',
        )
        expect(mockPrismaService.account.findFirst).toHaveBeenCalledWith({
          where: { id: 2 },
        })
      })

      it('should throw an error if the follower account does not exist', async () => {
        mockPrismaService.follow.findFirst.mockResolvedValue({
          id: 1,
          followerId: 1,
          followingId: 2,
        })
        mockPrismaService.account.findFirst
          .mockResolvedValueOnce({ id: 2 }) // Conta a ser deixada de seguir existe
          .mockResolvedValueOnce(null) // Conta do seguidor não existe

        await expect(service.unfollowAccount(1, 2)).rejects.toThrow(
          'Conta com ID 1 não encontrada',
        )
        expect(mockPrismaService.account.findFirst).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('create (DONOR)', () => {
    it('should create donor account', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.DONOR,
        email: 'donor@example.com',
        password: 'password123',
        name: 'Donor Name',
      }

      mockPrismaService.account.findFirst.mockResolvedValue(null)
      mockPrismaService.account.create.mockResolvedValue({
        id: 2,
        email: createAccountDto.email,
        name: createAccountDto.name,
        accountType: AccountType.DONOR,
        donor: { donations: [] },
        avatarId: null,
        media: null,
        institution: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.create(createAccountDto)
      expect(result).toHaveProperty('id', 2)
      expect(result.accountType).toBe(AccountType.DONOR)
    })

    it('should throw if email already exists', async () => {
      mockPrismaService.account.findFirst.mockResolvedValue({
        id: 5,
        email: 'exists@example.com',
      })
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.DONOR,
        email: 'exists@example.com',
        password: 'password123',
        name: 'Dup Name',
      }

      await expect(service.create(createAccountDto)).rejects.toThrow(
        'este email já está cadastrado',
      )
    })
  })

  describe('createWithGoogle', () => {
    it('should create donor account with google', async () => {
      mockOAuth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'google@example.com',
          name: 'Google User',
          picture: 'https://example.com/avatar.jpg',
        }),
      })

      mockPrismaService.account.findFirst.mockResolvedValue(null)
      mockPrismaService.account.create.mockResolvedValue({
        id: 3,
        email: 'google@example.com',
        name: 'Google User',
        accountType: AccountType.DONOR,
        donor: { donations: [] },
        avatarId: null,
        media: null,
        institution: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const createGoogleDto: CreateAccountGoogleDto = {
        idToken: 'google-id-token',
      }
      const result = await service.createWithGoogle(createGoogleDto)
      expect(result.email).toBe('google@example.com')
    })

    it('should throw if payload is null', async () => {
      mockOAuth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => null,
      })
      const createGoogleDto: CreateAccountGoogleDto = {
        idToken: 'invalid-token',
      }

      await expect(service.createWithGoogle(createGoogleDto)).rejects.toThrow(
        'Não foi possível autenticar. Tente novamente mais tarde.',
      )
    })

    it('should throw if email already exists', async () => {
      mockOAuth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'existing@example.com',
          name: 'Ex User',
          picture: 'https://example.com/avatar.jpg',
        }),
      })

      mockPrismaService.account.findFirst.mockResolvedValue({
        id: 10,
        email: 'existing@example.com',
      })
      const createGoogleDto: CreateAccountGoogleDto = { idToken: 'token' }

      await expect(service.createWithGoogle(createGoogleDto)).rejects.toThrow(
        'email já cadastrado',
      )
    })
  })

  describe('findAll', () => {
    it('should return all accounts', async () => {
      const accounts = [
        {
          id: 1,
          email: 'a@a.com',
          name: 'A',
          accountType: AccountType.DONOR,
          avatarId: null,
          media: null,
          donor: { donations: [] },
          institution: null,
        },
      ]

      mockPrismaService.account.findMany.mockResolvedValue(accounts)
      const result = await service.findAll()
      expect(result).toEqual(accounts)
    })
  })

  describe('findOne', () => {
    it('should return one account', async () => {
      const account = {
        id: 1,
        email: 'one@example.com',
        name: 'One',
        accountType: AccountType.DONOR,
        avatarId: null,
        media: null,
      }
      mockPrismaService.account.findUnique.mockResolvedValue(account)

      const result = await service.findOne(1)
      expect(result).toEqual(account)
    })

    it('should throw not found if no account', async () => {
      mockPrismaService.account.findUnique.mockResolvedValue(null)
      await expect(service.findOne(99)).rejects.toThrow('conta não encontrada')
    })
  })

  describe('findOneInstitution', () => {
    it('should return institution account', async () => {
      const inst = {
        id: 1,
        cnpj: '12345678000199',
        phone: '+123456789',
        category: { name: 'Educação' },
        fields: [],
        account: {
          id: 1,
          name: 'Institution Name',
          email: 'inst@example.com',
          avatarId: null,
          media: null,
        },
        isFollowing: false,
      }
      mockPrismaService.institution.findUnique.mockResolvedValue(inst)

      const result = await service.findOneInstitution(1)
      expect(result).toEqual(inst)
    })

    it('should throw not found if no institution account', async () => {
      mockPrismaService.institution.findUnique.mockResolvedValue(null)
      await expect(service.findOneInstitution(99)).rejects.toThrow(
        'conta da instituição não encontrada',
      )
    })
  })

  describe('findOneDonor', () => {
    it('should return donor account', async () => {
      const donor = {
        id: 2,
        account: {
          id: 2,
          name: 'Donor Name',
          email: 'donor@example.com',
          avatarId: null,
          media: null,
        },
        donations: [],
      }
      mockPrismaService.donor.findUnique.mockResolvedValue(donor)

      const result = await service.findOneDonor(2)
      expect(result).toEqual(donor)
    })

    it('should return nothing if no donor account', async () => {
      mockPrismaService.donor.findUnique.mockResolvedValue(null)
      const result = await service.findOneDonor(99)

      expect(result).toBeNull()
    })
  })

  describe('remove', () => {
    it('should remove account if authorized', async () => {
      const account = {
        id: 1,
        avatarId: 'media-id',
        institution: null,
        donor: null,
      }
      mockPrismaService.account.findUnique.mockResolvedValue(account)
      mockMediaService.deleteMediaAttachment.mockResolvedValue(undefined)
      mockPrismaService.account.delete.mockResolvedValue({
        message: 'deleted',
      })

      const result = await service.remove(1, 1)
      expect(prismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { institution: true, donor: true },
      })
      expect(mediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'media-id',
      )
      expect(prismaService.account.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
      expect(result).toEqual({ message: 'deleted' })
    })

    it('should throw unauthorized if accountId and id differ', async () => {
      mockPrismaService.account.findUnique.mockResolvedValue({ id: 1 })
      await expect(service.remove(1, 2)).rejects.toThrow(
        'Acesso não autorizado',
      )
    })

    it('should throw not found if no account', async () => {
      mockPrismaService.account.findUnique.mockResolvedValue(null)
      await expect(service.remove(999, 999)).rejects.toThrow(
        'Conta não encontrada',
      )
    })

    it('should handle prisma error P2025', async () => {
      mockPrismaService.account.findUnique.mockResolvedValue({ id: 1 })
      mockPrismaService.account.delete.mockRejectedValue({ code: 'P2025' })
      await expect(service.remove(1, 1)).rejects.toThrow('conta não encontrada')
    })
  })

  describe('update', () => {
    it('should update donor account data and media', async () => {
      const account = {
        id: 1,
        accountType: AccountType.DONOR,
        avatarId: 'old-media-id',
        institution: null,
        donor: {},
      }

      mockPrismaService.account.findUnique.mockResolvedValue(account)
      mockMediaService.deleteMediaAttachment.mockResolvedValue(undefined)
      const mediaAttachmentMock = { mediaAttachment: { id: 'new-media-id' } }
      mockMediaService.processMedia.mockResolvedValue(mediaAttachmentMock)

      mockPrismaService.account.update.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        name: 'Updated Name',
        accountType: AccountType.DONOR,
        donor: { donations: [] },
        avatarId: 'new-media-id',
        media: null,
        institution: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const updateDto: UpdateAccountDto = { name: 'Updated Name' }
      const file = {} as Express.Multer.File

      const result = await service.update(1, updateDto, file)

      expect(mockPrismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { institution: true, donor: true },
      })

      expect(mockMediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'old-media-id',
      )

      expect(mockMediaService.processMedia).toHaveBeenCalledWith(file, {
        accountId: 1,
      })

      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Name', avatarId: 'new-media-id' },
        select: expect.any(Object),
      })

      expect(result).toEqual({
        id: 1,
        email: 'user@example.com',
        name: 'Updated Name',
        accountType: AccountType.DONOR,
        donor: { donations: [] },
        avatarId: 'new-media-id',
        media: null,
        institution: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    })

    it('should update institution account data with category', async () => {
      const account = {
        id: 2,
        accountType: AccountType.INSTITUTION,
        avatarId: 'old-media-id',
        institution: {
          id: 1,
          phone: '123456789',
          category: { id: 1, name: 'Old Category' },
        },
        donor: null,
      }

      const newCategory = { id: 2, name: 'New Category' }

      mockPrismaService.account.findUnique.mockResolvedValue(account)
      mockMediaService.deleteMediaAttachment.mockResolvedValue(undefined)
      const mediaAttachmentMock = { mediaAttachment: { id: 'new-media-id' } }
      mockMediaService.processMedia.mockResolvedValue(mediaAttachmentMock)
      mockPrismaService.category.findFirst.mockResolvedValue(null)
      mockPrismaService.category.create.mockResolvedValue(newCategory)

      mockPrismaService.account.update.mockResolvedValue({
        id: 2,
        email: 'institution@example.com',
        name: 'Updated Institution',
        accountType: AccountType.INSTITUTION,
        institution: {
          id: 1,
          phone: '987654321',
          category: newCategory,
        },
        avatarId: 'new-media-id',
        media: null,
        donor: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const updateDto: UpdateAccountDto = {
        name: 'Updated Institution',
        phone: '987654321',
        category: 'New Category',
      }

      const file = {} as Express.Multer.File

      const result = await service.update(2, updateDto, file)

      expect(mockPrismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
        include: { institution: true, donor: true },
      })

      expect(mockMediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'old-media-id',
      )

      expect(mockMediaService.processMedia).toHaveBeenCalledWith(file, {
        accountId: 2,
      })

      expect(mockPrismaService.category.findFirst).toHaveBeenCalledWith({
        where: { name: 'New Category' },
      })

      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: { name: 'New Category' },
      })

      expect(mockPrismaService.account.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          name: 'Updated Institution',
          avatarId: 'new-media-id',
          institution: {
            update: {
              phone: '987654321',
              category: { connect: { id: newCategory.id } },
            },
          },
        },
        select: expect.any(Object),
      })

      expect(result).toEqual({
        id: 2,
        email: 'institution@example.com',
        name: 'Updated Institution',
        accountType: AccountType.INSTITUTION,
        institution: {
          id: 1,
          phone: '987654321',
          category: newCategory,
        },
        avatarId: 'new-media-id',
        media: null,
        donor: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    })

    it("should throw not found if account doesn't exist", async () => {
      mockPrismaService.account.findUnique.mockResolvedValue(null)
      const updateDto: UpdateAccountDto = {
        name: 'No Account',
        password: 'senha1234',
        confirmPassword: 'senha1234',
      }

      await expect(service.update(999, updateDto)).rejects.toThrow(
        'Conta não encontrada',
      )
    })
  })
})
