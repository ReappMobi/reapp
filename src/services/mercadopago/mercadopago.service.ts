import { Injectable } from '@nestjs/common'
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago'
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes'
import {
  PreferenceRequest,
  PreferenceResponse,
} from 'mercadopago/dist/clients/preference/commonTypes'

@Injectable()
export class MercadopagoService {
  private readonly client: MercadoPagoConfig

  constructor() {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    })
  }

  async processPayment(data: PreferenceRequest): Promise<PreferenceResponse> {
    const preference = new Preference(this.client)
    try {
      const response = await preference.create({ body: data })
      return response
    } catch (error) {
      return error
    }
  }

  async getPayment(paymentId: string): Promise<PaymentResponse> {
    const payment = new Payment(this.client)
    try {
      const response = await payment.get({ id: paymentId })
      return response
    } catch (error) {
      return error
    }
  }
}
