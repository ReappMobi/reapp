import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  AccountType,
  CreateAccountDto,
  CreateAccountGoogleDto,
} from './dto/create-account.dto';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

const donorResponseFields = {
  id: true,
  email: true,
  name: true,
  donor: {
    select: {
      donations: true,
    },
  },
  institution: true,
  createdAt: true,
  updatedAt: true,
};

const institutionResponseFields = {
  id: true,
  email: true,
  name: true,
  institution: {
    select: {
      cnpj: true,
      phone: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  },
};

@Injectable()
export class AccountService {
  private client: OAuth2Client;
  constructor(private readonly prismaService: PrismaService) {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  private async createInstitution(createAccountDto: CreateAccountDto) {
    const emailExists = await this.prismaService.account.findFirst({
      where: { email: createAccountDto.email },
    });

    const cnpjExists = await this.prismaService.institution.findFirst({
      where: { cnpj: createAccountDto.cnpj },
    });

    if (emailExists) {
      throw new HttpException(
        'este email já está cadastrado',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (cnpjExists) {
      throw new HttpException(
        'este cnpj já está cadastrado',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      let category = await this.prismaService.category.findFirst({
        where: { name: createAccountDto.category },
      });

      if (!category) {
        category = await this.prismaService.category.create({
          data: {
            name: createAccountDto.category,
          },
        });
      }

      const hashedPassword = bcrypt.hashSync(createAccountDto.password, 10);
      const account = await this.prismaService.account.create({
        data: {
          accountType: 'INSTITUTION',
          email: createAccountDto.email,
          passwordHash: hashedPassword,
          name: createAccountDto.name,
          institution: {
            create: {
              fields: {
                createMany: {
                  data: [],
                },
              },
              category: {
                connect: {
                  id: category.id,
                },
              },
              cnpj: createAccountDto.cnpj,
              phone: createAccountDto.phone,
            },
          },
        },
        select: institutionResponseFields,
      });

      return account;
    } catch (error) {
      throw new HttpException(
        'erro ao criar conta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async createDonor(createAccountDto: CreateAccountDto) {
    const emailExists = await this.prismaService.account.findFirst({
      where: { email: createAccountDto.email },
    });

    if (emailExists) {
      throw new HttpException(
        'este email já está cadastrado',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const hashedPassword = await bcrypt.hash(createAccountDto.password, 10);
      const account = await this.prismaService.account.create({
        data: {
          email: createAccountDto.email,
          passwordHash: hashedPassword,
          name: createAccountDto.name,
          avatar: createAccountDto.avatar,
          donor: {
            create: {},
          },
        },
        select: donorResponseFields,
      });

      return account;
    } catch (error) {
      throw new HttpException(
        'erro ao criar conta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(createAccountDto: CreateAccountDto) {
    if (createAccountDto.accountType === AccountType.INSTITUTION) {
      return await this.createInstitution(createAccountDto);
    }
    return await this.createDonor(createAccountDto);
  }

  async createWithGoogle(createAccountGoogleDto: CreateAccountGoogleDto) {
    const { idToken } = createAccountGoogleDto;

    const ticket = await this.client.verifyIdToken({
      idToken,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new HttpException(
        'Não foi possível autenticar. Tente novamente mais tarde.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const email = payload['email'];
    const name = payload['name'];
    const avatar = payload['picture'];

    const emailExists = await this.prismaService.account.findFirst({
      where: { email: email },
    });

    if (emailExists) {
      throw new HttpException('email já cadastrado', HttpStatus.BAD_REQUEST);
    }

    const createAccountDto: CreateAccountDto = {
      accountType: AccountType.DONOR,
      email: email,
      name: name,
      avatar: avatar,
      password: idToken,
    };

    return await this.createDonor(createAccountDto);
  }

  async findAll() {
    return await this.prismaService.account.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
        donor: {
          select: {
            donations: true,
          },
        },
        institution: {
          select: {
            cnpj: true,
            phone: true,
            category: {
              select: {
                name: true,
              },
            },
            fields: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const account = await this.prismaService.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new HttpException('conta não encontrada', HttpStatus.NOT_FOUND);
    }

    return account;
  }

  async remove(id: number) {
    try {
      return await this.prismaService.account.delete({
        where: {
          id: id,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException('conta não encontrada', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'erro ao deletar conta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
