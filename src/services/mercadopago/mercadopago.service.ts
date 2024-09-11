import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Payment } from 'mercadopago';

@Injectable()
export class MercadopagoService {
  private readonly client: MercadoPagoConfig;

  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
        idempotencyKey: process.env.MERCADOPAGO_IDEMPOTENCY_KEY,
      },
    });
  }

  async processPayment(data: any): Promise<any> {
    const payment = new Payment(this.client);
    const requestOptions = {
      idempotencyKey: process.env.MERCADOPAGO_IDEMPOTENCY_KEY,
    };
    try {
      const response = await payment.create({ body: data, requestOptions });
      return response;
    } catch (error) {
      return error;
    }
  }

  async getPayment(paymentId: string): Promise<any> {
    const payment = new Payment(this.client);
    try {
      const response = await payment.get({ id: paymentId });
      return response;
    } catch (error) {
      return error;
    }
  }
}
