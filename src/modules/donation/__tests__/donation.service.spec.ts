import { Test, TestingModule } from '@nestjs/testing';
import { DonationService } from '../donation.service';
import { MercadopagoService } from '../../../services/mercadopago/mercadopago.service';
import { PrismaService } from '../../../database/prisma.service';
import { RequestDonationDto } from '../dto/request-donation.dto';

describe('DonationService', () => {
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

  describe('requestDonation', () => {
    it('should throw an error if amount is negative', async () => {
      const requestDonationDto: RequestDonationDto = {
        userToken: 'test',
        amount: -10,
        institutionId: 1,
        projectId: 1,
        description: 'test',
      };
      await expect(service.requestDonation(requestDonationDto)).rejects.toThrow(
        'A quantidade de doação não pode ser negativa',
      );
    });

    it('should throw an error if amount is zero', async () => {
      const requestDonationDto: RequestDonationDto = {
        userToken: 'test',
        amount: 0,
        institutionId: 1,
        projectId: 1,
        description: 'test',
      };
      await expect(service.requestDonation(requestDonationDto)).rejects.toThrow(
        'A quantidade de doação não pode ser negativa',
      );
    });

    it('should throw an error if amount is less than 0.01', async () => {
      const requestDonationDto: RequestDonationDto = {
        userToken: 'test',
        amount: 0.001,
        institutionId: 1,
        projectId: 1,
        description: 'test',
      };
      await expect(service.requestDonation(requestDonationDto)).rejects.toThrow(
        'Valor inválido',
      );
    });

    describe('requestProjectDonation', () => {
      it('should call mercadopagoService.processPayment with correct data', async () => {
        const requestDonationDto: RequestDonationDto = {
          institutionId: null,
          userToken: 'test',
          amount: 10,
          projectId: 1,
          description: 'test',
        };
        const project = {
          id: 1,
          name: 'test project',
        };
        (prismaService.project.findUnique as jest.Mock).mockResolvedValue(
          project,
        );
        (mercadopagoService.processPayment as jest.Mock).mockResolvedValue(
          'payment link',
        );
        await service.requestDonation(requestDonationDto);
        expect(mercadopagoService.processPayment).toHaveBeenCalledWith({
          items: [
            {
              id: 'not_implemented',
              title: project.name,
              description: requestDonationDto.description,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: requestDonationDto.amount,
            },
          ],
          payer: {
            name: 'not_implemented',
            email: 'not_implemented',
          },
          notification_url: 'localhost:3000/donation/notify',
          external_reference: 'not_implemented',
        });
      });
      it('should throw an error if project is not found', async () => {
        const requestDonationDto: RequestDonationDto = {
          institutionId: null,
          userToken: 'test',
          amount: 10,
          projectId: 1,
          description: 'test',
        };
        (prismaService.project.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(
          service.requestDonation(requestDonationDto),
        ).rejects.toThrow('Projeto não encontrado');
      });
    });

    describe('requestInstitutionDonation', () => {
      it('should call mercadopagoService.processPayment with correct data', async () => {
        const requestDonationDto: RequestDonationDto = {
          userToken: 'test',
          amount: 10,
          institutionId: 1,
          description: 'test',
        };
        const institution = {
          id: 1,
          account: {
            name: 'test institution',
          },
        };
        (prismaService.institution.findUnique as jest.Mock).mockResolvedValue(
          institution,
        );
        (mercadopagoService.processPayment as jest.Mock).mockResolvedValue(
          'payment link',
        );
        await service.requestDonation(requestDonationDto);
        expect(mercadopagoService.processPayment).toHaveBeenCalledWith({
          items: [
            {
              id: 'not_implemented',
              title: institution.account.name,
              description: requestDonationDto.description,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: requestDonationDto.amount,
            },
          ],
          payer: {
            name: 'not_implemented',
            email: 'not_implemented',
          },
          notification_url: 'localhost:3000/donation/notify',
          external_reference: 'not_implemented',
        });
      });

      it('should throw an error if institution is not found', async () => {
        const requestDonationDto: RequestDonationDto = {
          userToken: 'test',
          amount: 10,
          institutionId: 1,
          description: 'test',
        };
        (prismaService.institution.findUnique as jest.Mock).mockResolvedValue(
          null,
        );
        await expect(
          service.requestDonation(requestDonationDto),
        ).rejects.toThrowError('Instituição não encontrada');
      });
    });
    describe('requestGeneralDonation', () => {
      it('should call mercadopagoService.processPayment with correct data', async () => {
        const requestDonationDto: RequestDonationDto = {
          institutionId: null,
          userToken: 'test',
          amount: 10,
          description: 'test',
        };
        (mercadopagoService.processPayment as jest.Mock).mockResolvedValue(
          'payment link',
        );
        await service.requestDonation(requestDonationDto);
        expect(mercadopagoService.processPayment).toHaveBeenCalledWith({
          items: [
            {
              id: 'not_implemented',
              title: 'Reapp',
              description: requestDonationDto.description,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: requestDonationDto.amount,
            },
          ],
          payer: {
            name: 'not_implemented',
            email: 'not_implemented',
          },
          notification_url: 'localhost:3000/donation/notify',
          external_reference: 'not_implemented',
        });
      });
    });
  });

  describe('callbackDonation', () => {
    it('should return "Callback donation"', async () => {
      const result = await service.notifyDonation();
      expect(result).toBe('Callback donation');
    });
  });
});
