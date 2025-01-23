import { Test, TestingModule } from '@nestjs/testing';
import { MercadopagoService } from './mercadopago.service';
import { Payment, Preference } from 'mercadopago';

jest.mock('mercadopago');
describe('MercadopagoService', () => {
  let service: MercadopagoService;
  let mercadopagoPreferenceMock: jest.Mocked<Preference>;
  let mercadopagoPaymentMock: jest.Mocked<Payment>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MercadopagoService],
    }).compile();

    service = module.get<MercadopagoService>(MercadopagoService);
    mercadopagoPaymentMock = Payment.prototype as any;
    mercadopagoPreferenceMock = Preference.prototype as any;
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
      mercadopagoPreferenceMock.create.mockResolvedValue(response as any);
      const result = await service.processPayment(data);
      expect(mercadopagoPreferenceMock.create).toHaveBeenCalledWith({
        body: data,
      });
      expect(result).toEqual(response);
    });

    it('should return error if mercadopago.create throws an error', async () => {
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
      const error = new Error('Test error');
      mercadopagoPreferenceMock.create.mockRejectedValue(error);
      const result = await service.processPayment(data);
      expect(mercadopagoPreferenceMock.create).toHaveBeenCalledWith({
        body: data,
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
      mercadopagoPaymentMock.get.mockResolvedValue(response as any);

      const result = await service.getPayment(preferenceId);

      expect(mercadopagoPaymentMock.get).toHaveBeenCalledWith({
        id: preferenceId,
      });
      expect(result).toEqual(response);
    });

    it('should return error if mercadopago.get throws an error', async () => {
      const preferenceId = '123';
      const error = new Error('Test error');
      mercadopagoPaymentMock.get.mockRejectedValue(error);

      const result = await service.getPayment(preferenceId);

      expect(mercadopagoPaymentMock.get).toHaveBeenCalledWith({
        id: preferenceId,
      });
      expect(result).toEqual(error);
    });
  });
});
