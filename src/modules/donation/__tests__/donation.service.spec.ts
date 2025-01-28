import { Test, TestingModule } from '@nestjs/testing';
import { DonationService } from '../donation.service';
import { MercadopagoService } from '../../../services/mercadopago/mercadopago.service';
import { PrismaService } from '../../../database/prisma.service';
import { RequestDonationDto } from '../dto/request-donation.dto';
import { NotificationRequestDto } from '../dto/notification.dto';

describe('DonationService tests', () => {
  let service: DonationService;
  let mercadopagoService: MercadopagoService;
  let prismaService: PrismaService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonationService,
        {
          provide: MercadopagoService,
          useValue: {
            processPayment: jest.fn(),
            getPayment: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            project: {
              findUnique: jest.fn(),
            },
            institution: {
              findUnique: jest.fn(),
            },
            account: {
              findUnique: jest.fn(),
            },
            donation: {
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DonationService>(DonationService);
    mercadopagoService = module.get<MercadopagoService>(MercadopagoService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('error case', () => {
    const requestDonationDto: RequestDonationDto = {
      amount: 10,
      institutionId: 1,
      projectId: 1,
      description: 'test',
    };
    it('should throw an error if the institution does not exist', async () => {
      (prismaService.institution.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
      });
      requestDonationDto.projectId = null;
      const accountId = 1;
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('Instituição não encontrada');
    });

    it('should throw an error if the project does not exist', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
      });
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue(null);
      requestDonationDto.institutionId = null;
      requestDonationDto.projectId = 1;
      const accountId = 1;
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('Projeto não encontrado');
    });

    it('should throw an error if the amount is less than or equal to 0', async () => {
      requestDonationDto.amount = 0;
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
      });
      const accountId = 1;
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('A quantidade de doação não pode ser negativa');
    });

    it('should throw an error if the amount is less than 0.01', async () => {
      requestDonationDto.amount = 0.001;
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
      });
      const accountId = 1;
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('Valor inválido');
    });

    it('should throw an error if account is not exists', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue(null);
      const accountId = 1;
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('Usuário não encontrado');
    });

    it('should throw an error if account is an institution', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
        institution: {
          id: 1,
        },
      });
      const accountId = 1;
      await expect(
        service.requestDonation(requestDonationDto, accountId),
      ).rejects.toThrow('Usuário é uma instituição e não pode fazer doações');
    });
  });

  describe('success case', () => {
    const requestDonationDto: RequestDonationDto = {
      amount: 10,
      institutionId: 1,
      projectId: 1,
      description: 'test',
    };

    it('should call mercadopagoService.processPayment with correct data when donate to a project', async () => {
      (prismaService.project.findUnique as jest.Mock).mockResolvedValue({
        name: 'test',
      });
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
        donor: {
          id: 1,
        },
      });
      (mercadopagoService.processPayment as jest.Mock).mockResolvedValue({
        id: 'test_id',
        init_point: 'https://test_url',
      });

      const accountId = 1;
      await service.requestDonation(requestDonationDto, accountId);
      expect(mercadopagoService.processPayment).toHaveBeenCalledWith({
        items: [
          {
            id: 'test',
            title: 'test',
            description: requestDonationDto.description,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: requestDonationDto.amount,
          },
        ],
        payer: {
          name: 'test',
          email: 'test@test.com',
        },
        external_reference: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        notification_url: 'https://reapp.dev.br/donation/notify',
      });
    });

    it('should call mercadopagoService.processPayment with correct data when donate to a institution', async () => {
      (prismaService.institution.findUnique as jest.Mock).mockResolvedValue({
        account: {
          name: 'test',
        },
      });
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
        donor: {
          id: 1,
        },
      });
      (mercadopagoService.processPayment as jest.Mock).mockResolvedValue({
        id: 'test_id',
        init_point: 'https://test_url',
      });
      requestDonationDto.projectId = null;
      requestDonationDto.institutionId = 1;
      const accountId = 1;
      await service.requestDonation(requestDonationDto, accountId);
      expect(mercadopagoService.processPayment).toHaveBeenCalledWith({
        items: [
          {
            id: 'test',
            title: 'test',
            description: requestDonationDto.description,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: requestDonationDto.amount,
          },
        ],
        payer: {
          name: 'test',
          email: 'test@test.com',
        },
        external_reference: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        notification_url: 'https://reapp.dev.br/donation/notify',
      });
    });

    it('should call mercadopagoService.processPayment with correct data with a general donation', async () => {
      (prismaService.account.findUnique as jest.Mock).mockResolvedValue({
        email: 'test@test.com',
        name: 'test',
        donor: {
          id: 1,
        },
      });
      (mercadopagoService.processPayment as jest.Mock).mockResolvedValue({
        id: 'test_id',
        init_point: 'https://test_url',
      });
      requestDonationDto.projectId = null;
      requestDonationDto.institutionId = null;

      const accountId = 1;
      await service.requestDonation(requestDonationDto, accountId);
      expect(mercadopagoService.processPayment).toHaveBeenCalledWith({
        items: [
          {
            id: 'Reapp',
            title: 'Reapp',
            description: requestDonationDto.description,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: requestDonationDto.amount,
          },
        ],
        payer: {
          name: 'test',
          email: 'test@test.com',
        },
        external_reference: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        notification_url: 'https://reapp.dev.br/donation/notify',
      });
    });
  });

  describe('notifyDonation', () => {
    const data: NotificationRequestDto = {
      id: 123,
      live_mode: true,
      type: 'payment',
      date_created: '2021-08-25T14:00:00Z',
      user_id: 123,
      api_version: 'v1',
      action: 'payment.created',
      data: {
        id: '123',
      },
    };

    it('should throw an error if payment is not found', async () => {
      (mercadopagoService.getPayment as jest.Mock).mockResolvedValue(null);
      await expect(service.notifyDonation(data)).rejects.toThrow(
        'Pagamento não encontrado',
      );
    });

    it('should call mercadopagoService.getPayment with correct data', async () => {
      (mercadopagoService.getPayment as jest.Mock).mockResolvedValue({
        id: '123',
        status: 'approved',
        transaction_amount: 10,
      });
      await service.notifyDonation(data);
      expect(mercadopagoService.getPayment).toHaveBeenCalledWith('123');
    });

    it('should call prismaService.donation.update with correct data to approved', async () => {
      (mercadopagoService.getPayment as jest.Mock).mockResolvedValue({
        id: '123',
        status: 'approved',
        transaction_amount: 10,
        external_reference: '1234',
      });
      await service.notifyDonation(data);
      expect(prismaService.donation.update).toHaveBeenCalledWith({
        data: {
          status: 'APPROVED',
        },
        where: {
          paymentTransactionId: '1234',
        },
      });
    });

    it('should call prismaService.donation.update with correct data to cancelled', async () => {
      (mercadopagoService.getPayment as jest.Mock).mockResolvedValue({
        id: '123',
        status: 'cancelled',
        transaction_amount: 10,
        external_reference: '1234',
      });
      await service.notifyDonation(data);
      expect(prismaService.donation.update).toHaveBeenCalledWith({
        data: {
          status: 'CANCELED',
        },
        where: {
          paymentTransactionId: '1234',
        },
      });
    });

    it('should call prismaService.donation.update with correct data to rejected', async () => {
      (mercadopagoService.getPayment as jest.Mock).mockResolvedValue({
        id: '123',
        status: 'rejected',
        transaction_amount: 10,
        external_reference: '1234',
      });
      await service.notifyDonation(data);
      expect(prismaService.donation.update).toHaveBeenCalledWith({
        data: {
          status: 'REJECTED',
        },
        where: {
          paymentTransactionId: '1234',
        },
      });
    });

    it('should not call prismaService.donation.update if status is not approved, cancelled or rejected', async () => {
      (mercadopagoService.getPayment as jest.Mock).mockResolvedValue({
        id: '123',
        status: 'in_process',
        transaction_amount: 10,
      });
      await service.notifyDonation(data);
      expect(prismaService.donation.update).not.toHaveBeenCalled();
    });
  });
});
