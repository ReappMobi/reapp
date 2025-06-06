import { MercadopagoService } from '../..//services/mercadopago/mercadopago.service'
import { PrismaService } from '../..//database/prisma.service'
import { RequestDonationDto } from './dto/request-donation.dto'
import { Injectable, HttpStatus, HttpException } from '@nestjs/common'
import {
  PreferenceRequest,
  PreferenceResponse,
} from 'mercadopago/dist/clients/preference/commonTypes'
import { NotificationRequestDto } from './dto/notification.dto'
import { v4 as uuidv4 } from 'uuid'
import { DonationStatus } from '@prisma/client'

type ExtendedDonationRequest = RequestDonationDto & {
  name: string
  email: string
}
// TODO: Simplify this class and fix error handling
@Injectable()
export class DonationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mercadopagoService: MercadopagoService,
  ) {}

  private buildRequestBody(
    bodyInfo: ExtendedDonationRequest,
    title = 'Reapp',
  ): PreferenceRequest {
    return {
      items: [
        {
          id: title,
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
      external_reference: uuidv4(),
      notification_url:
        process.env.MERCADOPAGO_NOTIFICATION_URL ||
        'https://exemploAplicacao.com/donation/notify',
    }
  }

  private async createMercadopagoRequest(mpRequestBody: PreferenceRequest) {
    try {
      const response =
        await this.mercadopagoService.processPayment(mpRequestBody)
      return response
    } catch (_error) {
      throw new HttpException(
        'Erro ao processar pagamento',
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  private async requestProjectDonation(
    requestDonationDto: ExtendedDonationRequest,
  ) {
    const { projectId } = requestDonationDto
    const project = await this.prismaService.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new HttpException('Projeto não encontrado', HttpStatus.BAD_REQUEST)
    }

    const mpRequestBody = this.buildRequestBody(
      requestDonationDto,
      project.name,
    )

    const response = await this.createMercadopagoRequest(mpRequestBody)
    if (!response.init_point) {
      throw new HttpException(
        'Erro ao processar pagamento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
    return response
  }

  private async requestInstitutionDonation(
    requestDonationDto: ExtendedDonationRequest,
  ) {
    const { institutionId } = requestDonationDto

    const institution = await this.prismaService.institution.findUnique({
      where: { id: institutionId },
      select: {
        account: true,
      },
    })

    if (!institution) {
      throw new HttpException(
        'Instituição não encontrada',
        HttpStatus.BAD_REQUEST,
      )
    }

    const mpRequestBody = this.buildRequestBody(
      requestDonationDto,
      institution.account.name,
    )

    const response = await this.createMercadopagoRequest(mpRequestBody)
    if (!response.init_point) {
      throw new HttpException(
        'Erro ao processar pagamento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
    return response
  }

  private async requestGeneralDonation(
    requestDonationDto: ExtendedDonationRequest,
  ) {
    const mpRequestBody = this.buildRequestBody(requestDonationDto)

    const response = await this.createMercadopagoRequest(mpRequestBody)
    if (!response.init_point) {
      throw new HttpException(
        'Erro ao processar pagamento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
    return response
  }

  async requestDonation(
    requestDonationDto: RequestDonationDto,
    accountId: number,
  ) {
    if (requestDonationDto.amount <= 0) {
      throw new HttpException(
        'A quantidade de doação não pode ser negativa',
        HttpStatus.BAD_REQUEST,
      )
    }

    const account = await this.prismaService.account.findUnique({
      where: {
        id: accountId,
      },
      select: {
        id: true,
        institution: true,
        name: true,
        email: true,
        donor: true,
      },
    })

    if (!account) {
      throw new HttpException('Usuário não encontrado', HttpStatus.BAD_REQUEST)
    }

    if (account.institution) {
      throw new HttpException(
        'Usuário é uma instituição e não pode fazer doações',
        HttpStatus.BAD_REQUEST,
      )
    }

    if (requestDonationDto.amount < 0.01) {
      throw new HttpException('Valor inválido', HttpStatus.BAD_REQUEST)
    }

    const requestData: ExtendedDonationRequest = {
      ...requestDonationDto,
      name: account.name,
      email: account.email,
    }

    let response: PreferenceResponse
    if (requestDonationDto.projectId) {
      response = await this.requestProjectDonation(requestData)
    } else if (requestDonationDto.institutionId) {
      response = await this.requestInstitutionDonation(requestData)
    } else {
      response = await this.requestGeneralDonation(requestData)
    }

    try {
      await this.prismaService.donation.create({
        data: {
          amount: requestDonationDto.amount,
          paymentCheckoutUrl: response.init_point,
          paymentTransactionId: response.external_reference,
          donor: {
            connect: {
              id: account.donor.id,
            },
          },
          ...(requestDonationDto.institutionId && {
            institution: {
              connect: { id: requestDonationDto.institutionId },
            },
          }),
          ...(requestDonationDto.projectId && {
            project: {
              connect: { id: requestDonationDto.projectId },
            },
          }),
        },
      })
      return response.init_point
    } catch (error) {
      console.error(error)
      throw new HttpException(
        'Erro ao salvar doação',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async getAllDonations(page: number, limit: number) {
    const donations = await this.prismaService.donation.findMany({
      skip: (page - 1) * limit,
      take: Number(limit),
      include: {
        donor: {
          select: {
            account: {
              select: { name: true },
            },
          },
        },
      },
    })

    return donations
  }

  async getDonationsByInstitution(
    user: any,
    page: number,
    limit: number,
    period: 'week' | 'month' | '6months' | 'year' | 'all' = 'week',
  ) {
    if (!user) {
      throw new HttpException(
        'Apenas usuários logados podem ver as doações recebidas',
        HttpStatus.FORBIDDEN,
      )
    }

    const thisAccount = await this.prismaService.account.findUnique({
      where: {
        id: +user.id,
      },
      select: { institution: { select: { id: true } } },
    })

    if (!thisAccount.institution) {
      throw new HttpException(
        'Apenas instituições podem ver as doações recebidas',
        HttpStatus.FORBIDDEN,
      )
    }

    try {
      const today = new Date()
      let startDate = new Date()

      switch (period) {
        case 'week':
          startDate.setDate(today.getDate() - 7)
          break
        case 'month':
          startDate.setDate(today.getDate() - 30)
          break
        case '6months':
          startDate.setMonth(today.getMonth() - 6)
          break
        case 'year':
          startDate.setFullYear(today.getFullYear() - 1)
          break
        case 'all':
          startDate = new Date(0)
          break
      }

      const whereClause = {
        institutionId: thisAccount.institution.id,
        projectId: null,
        status: {
          equals: DonationStatus.APPROVED,
        },
        createdAt: {
          gte: period !== 'all' ? startDate : undefined,
        },
      }

      const [donations, totals] = await Promise.all([
        this.prismaService.donation.findMany({
          where: whereClause,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            project: true,
            donor: {
              include: {
                account: {
                  select: {
                    name: true,
                    media: true,
                  },
                },
              },
            },
          },
          skip: (page - 1) * limit,
          take: Number(limit),
        }),

        this.prismaService.donation.aggregate({
          where: whereClause,
          _sum: {
            amount: true,
          },
          _count: true,
        }),
      ])

      return {
        donations,
        totalAmount: totals._sum.amount || 0,
        totalDonations: totals._count,
      }
    } catch (error) {
      console.error(error)
      throw new HttpException(
        'Erro ao buscar doações',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async getGeneralDonations(
    user: any,
    page: number,
    limit: number,
    period: 'week' | 'month' | '6months' | 'year' | 'all' = 'week',
  ) {
    if (!user) {
      throw new HttpException(
        'Apenas usuários logados podem ver as doações recebidas',
        HttpStatus.FORBIDDEN,
      )
    }

    const thisAccount = await this.prismaService.account.findUnique({
      where: {
        id: +user.id,
      },
      select: { institution: { select: { id: true } } },
    })

    if (!thisAccount.institution) {
      throw new HttpException(
        'Apenas instituições podem ver as doações recebidas',
        HttpStatus.FORBIDDEN,
      )
    }

    try {
      const today = new Date()
      let startDate = new Date()

      switch (period) {
        case 'week':
          startDate.setDate(today.getDate() - 7)
          break
        case 'month':
          startDate.setDate(today.getDate() - 30)
          break
        case '6months':
          startDate.setMonth(today.getMonth() - 6)
          break
        case 'year':
          startDate.setFullYear(today.getFullYear() - 1)
          break
        case 'all':
          startDate = new Date(0)
          break
      }

      const whereClause = {
        institutionId: null,
        projectId: null,
        status: {
          equals: DonationStatus.APPROVED,
        },
        createdAt: {
          gte: period !== 'all' ? startDate : undefined,
        },
      }

      const [donations, totals] = await Promise.all([
        // Query paginada
        this.prismaService.donation.findMany({
          where: whereClause,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            project: true,
            donor: {
              include: {
                account: {
                  select: {
                    name: true,
                    media: true,
                  },
                },
              },
            },
          },
          skip: (page - 1) * limit,
          take: Number(limit),
        }),

        this.prismaService.donation.aggregate({
          where: whereClause,
          _sum: {
            amount: true,
          },
          _count: true,
        }),
      ])

      return {
        donations,
        totalAmount: totals._sum.amount || 0,
        totalDonations: totals._count,
      }
    } catch (error) {
      console.error(error)
      throw new HttpException(
        'Erro ao buscar doações',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async getProjectsDonationsByInstitution(
    user: any,
    page: number,
    limit: number,
    period: 'week' | 'month' | '6months' | 'year' | 'all' = 'week',
  ) {
    if (!user) {
      throw new HttpException(
        'Apenas usuários logados podem ver as doações recebidas',
        HttpStatus.FORBIDDEN,
      )
    }

    const thisAccount = await this.prismaService.account.findUnique({
      where: {
        id: +user.id,
      },
      select: { institution: { select: { id: true } } },
    })

    if (!thisAccount.institution) {
      throw new HttpException(
        'Apenas instituições podem ver as doações recebidas',
        HttpStatus.FORBIDDEN,
      )
    }

    try {
      const today = new Date()
      let startDate = new Date()

      switch (period) {
        case 'week':
          startDate.setDate(today.getDate() - 7)
          break
        case 'month':
          startDate.setDate(today.getDate() - 30)
          break
        case '6months':
          startDate.setMonth(today.getMonth() - 6)
          break
        case 'year':
          startDate.setFullYear(today.getFullYear() - 1)
          break
        case 'all':
          startDate = new Date(0)
          break
      }

      const whereClause = {
        institutionId: thisAccount.institution.id,
        projectId: { not: null },
        status: {
          equals: DonationStatus.APPROVED,
        },
        createdAt: {
          gte: period !== 'all' ? startDate : undefined,
        },
      }
      const [donations, totals] = await Promise.all([
        this.prismaService.donation.findMany({
          where: whereClause,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            project: true,
            donor: {
              include: {
                account: {
                  select: {
                    name: true,
                    media: true,
                  },
                },
              },
            },
          },
          skip: (page - 1) * limit,
          take: Number(limit),
        }),

        this.prismaService.donation.aggregate({
          where: whereClause,
          _sum: {
            amount: true,
          },
          _count: true,
        }),
      ])
      return {
        donations,
        totalAmount: totals._sum.amount || 0,
        totalDonations: totals._count,
      }
    } catch (error) {
      console.error(error)
      throw new HttpException(
        'Erro ao buscar doações',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async getDonationsByInstitutionId(
    institutionId: number,
    page: number,
    limit: number,
    user: any,
  ) {
    const thisAccount = await this.prismaService.account.findUnique({
      where: {
        id: +user.id,
      },
      select: { institution: { select: { id: true } } },
    })

    if (!thisAccount.institution) {
      throw new HttpException(
        'Apenas instituições podem ver as doações recebidas',
        HttpStatus.FORBIDDEN,
      )
    }

    if (thisAccount.institution.id !== institutionId) {
      throw new HttpException(
        'Instituições não podem ver doações de outras instituições',
        HttpStatus.FORBIDDEN,
      )
    }

    try {
      const donations = await this.prismaService.donation.findMany({
        where: {
          institutionId: Number(institutionId),
          status: {
            equals: 'APPROVED',
          },
        },
        include: {
          project: true,
          donor: {
            include: {
              account: {
                select: {
                  name: true,
                  media: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: Number(limit),
      })
      return donations
    } catch (error) {
      console.error(error)
      throw new HttpException(
        'Erro ao buscar doações',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async getDonationsByProject(projectId: number, page: number, limit: number) {
    const donations =
      (await this.prismaService.donation.findMany({
        where: {
          projectId: Number(projectId),
        },
        skip: (page - 1) * limit,
        take: Number(limit),
      })) || []
    return donations
  }

  async getDonationsByDonor(
    donorId: number,
    page: number,
    limit: number,
    institutionId: number = null,
    projectId: number = null,
    user: any,
    period: 'week' | 'month' | '6months' | 'year' | 'all' = 'week',
  ) {
    const { id } = user

    const userExist = await this.prismaService.account.findUnique({
      where: { id },
      select: {
        id: true,
        donor: true,
      },
    })

    if (userExist && userExist.donor && donorId !== userExist.donor.id) {
      throw new HttpException(
        'Doadores não podem ver doações de outros doadores',
        HttpStatus.FORBIDDEN,
      )
    }

    try {
      const today = new Date()
      let startDate = new Date()

      switch (period) {
        case 'week':
          startDate.setDate(today.getDate() - 7)
          break
        case 'month':
          startDate.setDate(today.getDate() - 30)
          break
        case '6months':
          startDate.setMonth(today.getMonth() - 6)
          break
        case 'year':
          startDate.setFullYear(today.getFullYear() - 1)
          break
        case 'all':
          startDate = new Date(0)
          break
      }

      const whereClause = {
        donorId: userExist.donor.id,
        projectId: projectId ? projectId : undefined,
        institutionId: institutionId ? institutionId : undefined,
        status: {
          equals: DonationStatus.APPROVED,
        },
        createdAt: {
          gte: period !== 'all' ? startDate : undefined,
        },
      }

      const [donations, totals] = await Promise.all([
        this.prismaService.donation.findMany({
          where: whereClause,
          include: {
            project: {
              select: {
                id: true,
                name: true,
                media: true,
              },
            },
            institution: {
              select: {
                account: {
                  select: {
                    name: true,
                    media: true,
                  },
                },
              },
            },
          },
          skip: (page - 1) * limit,
          take: Number(limit),
        }),
        this.prismaService.donation.aggregate({
          where: whereClause,
          _sum: {
            amount: true,
          },
          _count: true,
        }),
      ])

      console.log(donations)
      return {
        donations,
        totalAmount: totals._sum.amount || 0,
        totalDonations: totals._count,
      }
    } catch (error) {
      console.error(error)
      throw new HttpException(
        'Erro ao buscar doações',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async notifyDonation(data: NotificationRequestDto) {
    console.log(data)
    if (data.type !== 'payment') return

    const payment = await this.mercadopagoService.getPayment(data.data.id)

    if (!payment) {
      throw new HttpException(
        'Pagamento não encontrado',
        HttpStatus.BAD_REQUEST,
      )
    }

    const statusMap = {
      approved: 'APPROVED',
      cancelled: 'CANCELED',
      rejected: 'REJECTED',
    }
    if (statusMap[payment.status]) {
      await this.prismaService.donation.update({
        where: {
          paymentTransactionId: String(payment.external_reference),
        },
        data: {
          status: statusMap[payment.status],
        },
      })
    }
  }
}
