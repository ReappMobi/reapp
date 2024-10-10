import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export type PreferenceRequest = {
  items: {
    id: string;
    title: string;
    description: string;
    quantity: number;
    currency_id: string;
    unit_price: number;
  }[];
  payer: {
    name: string;
    email: string;
  };
  notification_url: string;
};

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
    const preference = new Preference(this.client);
    const requestOptions = {
      idempotencyKey: process.env.MERCADOPAGO_IDEMPOTENCY_KEY,
    };
    try {
      const response = await preference.create({ body: data, requestOptions });
      return response;
    } catch (error) {
      return error;
    }
  }

  async getPayment(preferenceId: string): Promise<any> {
    const preference = new Preference(this.client);
    try {
      const response = await preference.get({ preferenceId });
      return response;
    } catch (error) {
      return error;
    }
  }
}
