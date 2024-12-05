import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from '../account.service';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateAccountDto,
  CreateAccountGoogleDto,
} from '../dto/create-account.dto';
import { AccountType } from '@prisma/client';
import { MediaService } from '../../media-attachment/media-attachment.service';
import { UpdateAccountDto } from '../dto/update-account.dto';

describe('AccountService', () => {
  let service: AccountService;
  let prismaService: PrismaService;
  let mediaService: MediaService;

  const mockPrismaService = {
    account: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
  };

  const mockMediaService = {
    processMedia: jest.fn(),
    deleteMediaAttachment: jest.fn(),
    getMediaAttachmentById: jest.fn(),
  };

  const mockOAuth2Client = {
    verifyIdToken: jest.fn(),
  };

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
    }).compile();

    service = module.get<AccountService>(AccountService);
    prismaService = module.get<PrismaService>(PrismaService);
    mediaService = module.get<MediaService>(MediaService);

    // Sobrescrevendo o OAuth2Client dentro do service manualmente
    // Como o service instancia diretamente o OAuth2Client, podemos fazer:
    // (service as any).client = mockOAuth2Client;
    // Alternativamente, poderíamos ajustar a classe para injetar o client.
    (service as any).client = mockOAuth2Client;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
      };

      mockPrismaService.account.findFirst.mockResolvedValue(null); // email não existe
      mockPrismaService.institution.findFirst.mockResolvedValue(null); // cnpj não existe
      mockPrismaService.category.findFirst.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue({
        id: 1,
        name: 'Educação',
      });
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
      });

      const result = await service.create(createAccountDto);
      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
        where: { email: createAccountDto.email },
      });
      expect(prismaService.institution.findFirst).toHaveBeenCalledWith({
        where: { cnpj: createAccountDto.cnpj },
      });
      expect(result).toHaveProperty('id', 1);
      expect(result.institution.cnpj).toBe(createAccountDto.cnpj);
    });

    it('should throw if email already exists', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.INSTITUTION,
        email: 'inst@example.com',
        password: 'password123',
        name: 'Institution Name',
        phone: '+123456789',
        cnpj: '12345678000199',
        category: 'Educação',
      };

      mockPrismaService.account.findFirst.mockResolvedValue({
        id: 1,
        email: createAccountDto.email,
      });

      await expect(service.create(createAccountDto)).rejects.toThrow(
        'este email já está cadastrado',
      );
    });

    it('should throw if cnpj already exists', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.INSTITUTION,
        email: 'new@example.com',
        password: 'password123',
        name: 'New Inst',
        phone: '+123456789',
        cnpj: '12345678000199',
        category: 'Educação',
      };

      mockPrismaService.account.findFirst.mockResolvedValue(null);
      mockPrismaService.institution.findFirst.mockResolvedValue({
        id: 99,
        cnpj: createAccountDto.cnpj,
      });

      await expect(service.create(createAccountDto)).rejects.toThrow(
        'este cnpj já está cadastrado',
      );
    });
  });

  describe('create (DONOR)', () => {
    it('should create donor account', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.DONOR,
        email: 'donor@example.com',
        password: 'password123',
        name: 'Donor Name',
      };

      mockPrismaService.account.findFirst.mockResolvedValue(null);
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
      });

      const result = await service.create(createAccountDto);
      expect(result).toHaveProperty('id', 2);
      expect(result.accountType).toBe(AccountType.DONOR);
    });

    it('should throw if email already exists', async () => {
      mockPrismaService.account.findFirst.mockResolvedValue({
        id: 5,
        email: 'exists@example.com',
      });
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.DONOR,
        email: 'exists@example.com',
        password: 'password123',
        name: 'Dup Name',
      };

      await expect(service.create(createAccountDto)).rejects.toThrow(
        'este email já está cadastrado',
      );
    });
  });

  describe('createWithGoogle', () => {
    it('should create donor account with google', async () => {
      mockOAuth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'google@example.com',
          name: 'Google User',
          picture: 'https://example.com/avatar.jpg',
        }),
      });

      mockPrismaService.account.findFirst.mockResolvedValue(null);
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
      });

      const createGoogleDto: CreateAccountGoogleDto = {
        idToken: 'google-id-token',
      };
      const result = await service.createWithGoogle(createGoogleDto);
      expect(result.email).toBe('google@example.com');
    });

    it('should throw if payload is null', async () => {
      mockOAuth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => null,
      });
      const createGoogleDto: CreateAccountGoogleDto = {
        idToken: 'invalid-token',
      };

      await expect(service.createWithGoogle(createGoogleDto)).rejects.toThrow(
        'Não foi possível autenticar. Tente novamente mais tarde.',
      );
    });

    it('should throw if email already exists', async () => {
      mockOAuth2Client.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'existing@example.com',
          name: 'Ex User',
          picture: 'https://example.com/avatar.jpg',
        }),
      });

      mockPrismaService.account.findFirst.mockResolvedValue({
        id: 10,
        email: 'existing@example.com',
      });
      const createGoogleDto: CreateAccountGoogleDto = { idToken: 'token' };

      await expect(service.createWithGoogle(createGoogleDto)).rejects.toThrow(
        'email já cadastrado',
      );
    });
  });

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
      ];

      mockPrismaService.account.findMany.mockResolvedValue(accounts);
      const result = await service.findAll();
      expect(result).toEqual(accounts);
    });
  });

  describe('findOne', () => {
    it('should return one account', async () => {
      const account = {
        id: 1,
        email: 'one@example.com',
        name: 'One',
        accountType: AccountType.DONOR,
        avatarId: null,
        media: null,
      };
      mockPrismaService.account.findUnique.mockResolvedValue(account);

      const result = await service.findOne(1);
      expect(result).toEqual(account);
    });

    it('should throw not found if no account', async () => {
      mockPrismaService.account.findUnique.mockResolvedValue(null);
      await expect(service.findOne(99)).rejects.toThrow('conta não encontrada');
    });
  });

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
      };
      mockPrismaService.institution.findUnique.mockResolvedValue(inst);

      const result = await service.findOneInstitution(1);
      expect(result).toEqual(inst);
    });

    it('should throw not found if no institution account', async () => {
      mockPrismaService.institution.findUnique.mockResolvedValue(null);
      await expect(service.findOneInstitution(99)).rejects.toThrow(
        'conta da instituição não encontrada',
      );
    });
  });

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
      };
      mockPrismaService.donor.findUnique.mockResolvedValue(donor);

      const result = await service.findOneDonor(2);
      expect(result).toEqual(donor);
    });

    it('should throw not found if no donor account', async () => {
      mockPrismaService.donor.findUnique.mockResolvedValue(null);
      await expect(service.findOneDonor(99)).rejects.toThrow(
        'conta do doador não encontrada',
      );
    });
  });

  describe('remove', () => {
    it('should remove account if authorized', async () => {
      const account = {
        id: 1,
        avatarId: 'media-id',
        institution: null,
        donor: null,
      };
      mockPrismaService.account.findUnique.mockResolvedValue(account);
      mockMediaService.deleteMediaAttachment.mockResolvedValue(undefined);
      mockPrismaService.account.delete.mockResolvedValue({
        message: 'deleted',
      });

      const result = await service.remove(1, 1);
      expect(prismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { institution: true, donor: true },
      });
      expect(mediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'media-id',
      );
      expect(prismaService.account.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual({ message: 'deleted' });
    });

    it('should throw unauthorized if accountId and id differ', async () => {
      mockPrismaService.account.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.remove(1, 2)).rejects.toThrow(
        'Acesso não autorizado',
      );
    });

    it('should throw not found if no account', async () => {
      mockPrismaService.account.findUnique.mockResolvedValue(null);
      await expect(service.remove(999, 999)).rejects.toThrow(
        'Conta não encontrada',
      );
    });

    it('should handle prisma error P2025', async () => {
      mockPrismaService.account.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.account.delete.mockRejectedValue({ code: 'P2025' });
      await expect(service.remove(1, 1)).rejects.toThrow(
        'conta não encontrada',
      );
    });
  });

  describe('update', () => {
    it('should update account data and media', async () => {
      const account = {
        id: 1,
        accountType: AccountType.DONOR,
        avatarId: 'old-media-id',
        institution: null,
        donor: {},
      };
      mockPrismaService.account.findUnique.mockResolvedValue(account);

      mockMediaService.deleteMediaAttachment.mockResolvedValue(undefined);
      const mediaAttachmentMock = { mediaAttachment: { id: 'new-media-id' } };
      mockMediaService.processMedia.mockResolvedValue(mediaAttachmentMock);
      mockMediaService.getMediaAttachmentById.mockResolvedValue({
        mediaResponse: {
          id: 'new-media-id',
          url: 'http://example.com/media.jpg',
        },
      });

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
      });

      const updateDto: UpdateAccountDto = { name: 'Updated Name' };
      const file = {} as Express.Multer.File;
      const result = await service.update(1, updateDto, file);

      expect(prismaService.account.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { institution: true, donor: true },
      });
      expect(mediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'old-media-id',
      );
      expect(mediaService.processMedia).toHaveBeenCalled();
      expect(prismaService.account.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Updated Name', avatarId: 'new-media-id' },
        select: expect.any(Object),
      });
      expect(result.media).toEqual({
        id: 'new-media-id',
        url: 'http://example.com/media.jpg',
      });
    });

    it("should throw not found if account doesn't exist", async () => {
      mockPrismaService.account.findUnique.mockResolvedValue(null);
      const updateDto: UpdateAccountDto = { name: 'No Account' };

      await expect(service.update(999, updateDto)).rejects.toThrow(
        'Conta não encontrada',
      );
    });
  });
});
