import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from '../account.service';
import { PrismaService } from '../../../database/prisma.service';
import { AccountType, CreateAccountDto } from '../dto/create-account.dto';

const mockPrismaService = {
  account: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  institution: {
    findFirst: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInstitution', () => {
    const createAccountDto: CreateAccountDto = {
      accountType: AccountType.INSTITUTION,
      email: 'test@example.com',
      password: 'password',
      name: 'Test Institution',
      phone: '1234567890',
      cnpj: '12345678901234',
      category: 'Test Category',
    };

    it('should throw an error if email already exists', async () => {
      mockPrismaService.account.findFirst.mockResolvedValue({
        email: 'test@example.com',
      });

      await expect(service.create(createAccountDto)).rejects.toThrowError(
        'este email já está cadastrado',
      );
    });

    it('should throw an error if cnpj already exists', async () => {
      mockPrismaService.account.findFirst.mockResolvedValue(null);
      mockPrismaService.institution.findFirst.mockResolvedValue({
        cnpj: '12345678901234',
      });

      await expect(service.create(createAccountDto)).rejects.toThrowError(
        'este cnpj já está cadastrado',
      );
    });
  });

  describe('createDonor', () => {
    const createAccountDto: CreateAccountDto = {
      accountType: AccountType.DONOR,
      email: 'test@example.com',
      password: 'password',
      name: 'Test Donor',
    };

    it('should throw an error if email already exists', async () => {
      mockPrismaService.account.findFirst.mockResolvedValue({
        email: 'test@example.com',
      });

      await expect(service.create(createAccountDto)).rejects.toThrowError(
        'este email já está cadastrado',
      );
    });
  });

  describe('create', () => {
    it('should call createInstitution if accountType is institution', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.INSTITUTION,
        email: 'test@example.com',
        password: 'password',
        name: 'Test Institution',
        phone: '1234567890',
        cnpj: '12345678901234',
        category: 'Test Category',
      };

      jest.spyOn(service, 'create').mockResolvedValue(undefined);

      await service.create(createAccountDto);

      expect(service.create).toHaveBeenCalledWith(createAccountDto);
    });

    it('should call createDonor if accountType is donor', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.DONOR,
        email: 'test@example.com',
        password: 'password',
        name: 'Test Donor',
      };

      jest.spyOn(service, 'create').mockResolvedValue(undefined);

      await service.create(createAccountDto);

      expect(service.create).toHaveBeenCalledWith(createAccountDto);
    });
  });
});
