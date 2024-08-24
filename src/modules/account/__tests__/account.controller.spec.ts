import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from '../account.controller';
import { AccountService } from '../account.service';
import { AccountType, CreateAccountDto } from '../dto/create-account.dto';

describe('AccountController', () => {
  let controller: AccountController;
  let accountService: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AccountService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
    accountService = module.get<AccountService>(AccountService);
  });

  describe('create', () => {
    it('should call accountService.create with the correct data', async () => {
      const createAccountDto: CreateAccountDto = {
        accountType: AccountType.DONOR,
        email: 'test@example.com',
        password: 'password',
        name: 'Test Donor',
      };

      await controller.create(createAccountDto);

      expect(accountService.create).toHaveBeenCalledWith(createAccountDto);
    });
  });

  describe('findAll', () => {
    it('should call accountService.findAll', async () => {
      await controller.findAll();

      expect(accountService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call accountService.findOne with the correct id', async () => {
      const id = 1;

      await controller.findOne(id.toString());

      expect(accountService.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('remove', () => {
    it('should call accountService.remove with the correct id', async () => {
      const id = 1;
      await controller.remove(id.toString());
      expect(accountService.remove).toHaveBeenCalledWith(id);
    });
  });
});
