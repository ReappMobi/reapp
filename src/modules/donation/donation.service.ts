import { MercadopagoService } from '../..//services/mercadopago/mercadopago.service';
import { PrismaService } from '../..//database/prisma.service';
import { RequestDonationDto } from './dto/request-donation.dto';
import { Injectable, HttpStatus, HttpException } from '@nestjs/common';

type itemInfo = {
  title: string;
  description: string;
  unit_price: number;
};

type Item = {
  id: string;
  quantity: number;
  currency_id: string;
} & itemInfo;

type mercadopagoRequest = {
  items: Item[];
  payer: {
    email: string;
    name: string;
  };
  notification_url: string;
  external_reference: string;
};

@Injectable()
export class DonationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mercadopagoService: MercadopagoService,
  ) {}

  private buildRequestBody(itemInfo: itemInfo): mercadopagoRequest {
    return {
      items: [
        {
          id: 'not_implemented',
          title: itemInfo.title,
          description: itemInfo.description,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: itemInfo.unit_price,
        },
      ],
      payer: {
        name: 'not_implemented',
        email: 'not_implemented',
      },
      notification_url:
        process.env.MERCADOPAGO_NOTIFICATION_URL ||
        'localhost:3000/donation/notify',
      external_reference: 'not_implemented',
    };
  }

  private async createMercadopagoRequest(mpRequestBody: mercadopagoRequest) {
    try {
      const response =
        await this.mercadopagoService.processPayment(mpRequestBody);
      return response;
    } catch (error) {
      throw new HttpException(
        'Erro ao processar pagamento',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async requestProjectDonation(requestDonationDto: RequestDonationDto) {
    const { projectId } = requestDonationDto;
    const project = await this.prismaService.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new HttpException('Projeto não encontrado', HttpStatus.BAD_REQUEST);
    }

    const itemInfo = {
      title: project.name,
      description: requestDonationDto.description,
      unit_price: requestDonationDto.amount,
    };

    const mpRequestBody = this.buildRequestBody(itemInfo);
    return this.createMercadopagoRequest(mpRequestBody);
  }

  private async requestInstitutionDonation(
    requestDonationDto: RequestDonationDto,
  ) {
    const { institutionId } = requestDonationDto;

    const institution = await this.prismaService.institution.findUnique({
      where: { id: institutionId },
      select: {
        account: true,
      },
    });

    if (!institution) {
      throw new HttpException(
        'Instituição não encontrada',
        HttpStatus.BAD_REQUEST,
      );
    }

    const itemInfo = {
      title: institution.account.name,
      description: requestDonationDto.description,
      unit_price: requestDonationDto.amount,
    };

    const mpRequestBody = this.buildRequestBody(itemInfo);
    return this.createMercadopagoRequest(mpRequestBody);
  }

  private requestGeneralDonation(requestDonationDto: RequestDonationDto) {
    const itemInfo = {
      title: 'Reapp',
      description: requestDonationDto.description,
      unit_price: requestDonationDto.amount,
    };
    const mpRequestBody = this.buildRequestBody(itemInfo);
    return this.createMercadopagoRequest(mpRequestBody);
  }

  async requestDonation(requestDonationDto: RequestDonationDto) {
    if (requestDonationDto.amount < 0 || requestDonationDto.amount === 0) {
      throw new HttpException(
        'A quantidade de doação não pode ser negativa',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (requestDonationDto.amount < 0.01) {
      throw new HttpException('Valor inválido', HttpStatus.BAD_REQUEST);
    }
    if (requestDonationDto.projectId) {
      return this.requestProjectDonation(requestDonationDto);
    }
    if (requestDonationDto.institutionId) {
      return this.requestInstitutionDonation(requestDonationDto);
    }
    return this.requestGeneralDonation(requestDonationDto);
  }

  async notifyDonation() {
    return 'notify donation';
  }
}
