import { PrismaService } from '@app/database/prisma.service'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import * as PrismaClient from '@prisma/client'
import { MailService } from '../mail/mail.service'

@Injectable()
export class PasswordRecoveryService {
  constructor(
    private readonly primsaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async recoveryPassword(tokenId: string, code: string) {
    if (!tokenId || tokenId === '') {
      throw new HttpException('Token não informado', HttpStatus.BAD_REQUEST)
    }

    const token = await this.primsaService.token.findFirst({
      where: {
        id: tokenId,
        AND: {
          expiresAt: { gte: new Date() },
          active: { equals: true },
          tokenType: PrismaClient.TokenType.EMAIL_CONFIRMATION,
        },
      },
      include: {
        account: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    if (!token) {
      throw new HttpException('Token inválido', HttpStatus.BAD_REQUEST)
    }

    if (token.code !== code) {
      throw new HttpException('Código inválido', HttpStatus.BAD_REQUEST)
    }

    await this.primsaService.token.update({
      where: { id: tokenId },
      data: { active: false },
    })

    const resetPasswordToken = await this.primsaService.token.create({
      data: {
        accountId: token.account.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 5),
        tokenType: PrismaClient.TokenType.PASSWORD_RESET,
      },
    })

    return { message: 'Token válido', token: resetPasswordToken.id }
  }

  async sendRecoveryEmail(email: string) {
    if (!email || email === '') {
      throw new HttpException('Email não informado', HttpStatus.BAD_REQUEST)
    }

    const account = await this.primsaService.account.findFirst({
      where: {
        email,
      },
    })

    if (!account) {
      throw new HttpException('Conta não encontrada', HttpStatus.NOT_FOUND)
    }

    const token = await this.primsaService.token.create({
      data: {
        accountId: account.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 5),
        code: this.generateRecoveryCode(),
        tokenType: PrismaClient.TokenType.EMAIL_CONFIRMATION,
      },
    })

    if (!token) {
      throw new HttpException(
        'Erro ao criar token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    await this.mailService.sendRecoveryEmail(account, token.code)

    return { message: 'Email enviado com sucesso', token: token.id }
  }

  private generateRecoveryCode() {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return ((buffer[0] % 900000) + 100000).toString()
  }
}
