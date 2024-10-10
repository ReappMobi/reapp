import { Test, TestingModule } from '@nestjs/testing';
import { MercadopagoService } from './mercadopago.service';
import { Preference } from 'mercadopago';

jest.mock('mercadopago');
describe('MercadopagoService', () => {
  let service: MercadopagoService;
  let mercadoPagoMock: jest.Mocked<Preference>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MercadopagoService],
    }).compile();

    service = module.get<MercadopagoService>(MercadopagoService);
    mercadoPagoMock = Preference.prototype as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPayment', () => {
    it('should call mercadopago.create with correct data', async () => {
      const data = {
        items: [
          {
            id: '1',
            title: 'Test',
            description: 'Test description',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: 10,
          },
        ],
        payer: {
          name: 'Test',
          email: 'test@test.com',
        },
        notification_url: 'https://test.com/webhook',
      };
      const response = {
        body: {
          init_point: 'https://test.com/payment',
        },
      };
      mercadoPagoMock.create.mockResolvedValue(response as any);

      const result = await service.processPayment(data);

      expect(mercadoPagoMock.create).toHaveBeenCalledWith({
        body: data,
        requestOptions: {
          idempotencyKey: process.env.MERCADOPAGO_IDEMPOTENCY_KEY,
        },
      });
      expect(result).toEqual(response);
    });

    it('should handle errors', async () => {
      const data = {
        items: [],
      };
      const error = new Error('Test error');
      mercadoPagoMock.create.mockRejectedValue(error);

      const result = await service.processPayment(data);

      expect(mercadoPagoMock.create).toHaveBeenCalledWith({
        body: data,
        requestOptions: {
          idempotencyKey: process.env.MERCADOPAGO_IDEMPOTENCY_KEY,
        },
      });
      expect(result).toEqual(error);
    });
  });

  describe('getPayment', () => {
    it('should call mercadopago.get with correct data', async () => {
      const preferenceId = '123';
      const response = {
        body: {
          status: 'approved',
        },
      };
      mercadoPagoMock.get.mockResolvedValue(response as any);

      const result = await service.getPayment(preferenceId);

      expect(mercadoPagoMock.get).toHaveBeenCalledWith({
        preferenceId: preferenceId,
      });
      expect(result).toEqual(response);
    });

    it('should handle errors', async () => {
      const preferenceId = '123';
      const error = new Error('Test error');
      mercadoPagoMock.get.mockRejectedValue(error);

      const result = await service.getPayment(preferenceId);

      expect(mercadoPagoMock.get).toHaveBeenCalledWith({
        preferenceId: preferenceId,
      });
      expect(result).toEqual(error);
    });
  });
});
