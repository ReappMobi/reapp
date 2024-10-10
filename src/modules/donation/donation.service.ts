import { MercadopagoService } from '../..//services/mercadopago/mercadopago.service';
import { PrismaService } from '../..//database/prisma.service';
import { RequestDonationDto } from './dto/request-donation.dto';
import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { PreferenceRequest } from 'mercadopago/dist/clients/preference/commonTypes';

@Injectable()
export class DonationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mercadopagoService: MercadopagoService,
  ) {}

  private buildRequestBody(
    bodyInfo: RequestDonationDto,
    title = 'Reapp',
  ): PreferenceRequest {
    return {
      items: [
        {
          id: 'not_implemented',
          title: title,
          description: bodyInfo.description,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: bodyInfo.amount,
        },
      ],
      payer: {
        name: bodyInfo.name,
        email: bodyInfo.email,
      },
      notification_url:
        process.env.MERCADOPAGO_NOTIFICATION_URL ||
        'localhost:3000/donation/notify',
    };
  }

  private async createMercadopagoRequest(mpRequestBody: PreferenceRequest) {
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

    const mpRequestBody = this.buildRequestBody(
      requestDonationDto,
      project.name,
    );

    const response = await this.createMercadopagoRequest(mpRequestBody);
    if (!response.init_point) {
      throw new HttpException(
        'Erro ao processar pagamento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return response;
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

    const mpRequestBody = this.buildRequestBody(
      requestDonationDto,
      institution.account.name,
    );

    const response = await this.createMercadopagoRequest(mpRequestBody);
    if (!response.init_point) {
      throw new HttpException(
        'Erro ao processar pagamento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return response;
  }

  private async requestGeneralDonation(requestDonationDto: RequestDonationDto) {
    const mpRequestBody = this.buildRequestBody(requestDonationDto);

    const response = await this.createMercadopagoRequest(mpRequestBody);
    if (!response.init_point) {
      throw new HttpException(
        'Erro ao processar pagamento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return response;
  }

  async requestDonation(requestDonationDto: RequestDonationDto) {
    if (requestDonationDto.amount <= 0) {
      throw new HttpException(
        'A quantidade de doação não pode ser negativa',
        HttpStatus.BAD_REQUEST,
      );
    }

    const account = await this.prismaService.account.findUnique({
      where: {
        email: requestDonationDto.email,
      },
      select: {
        institution: true,
      },
    });

    if (!account) {
      throw new HttpException('Usuário não encontrado', HttpStatus.BAD_REQUEST);
    }

    if (account.institution) {
      throw new HttpException(
        'Usuário é uma instituição e não pode fazer doações',
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
