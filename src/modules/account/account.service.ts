import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AccountType, CreateAccountDto } from './dto/create-account.dto';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountService {
  constructor(private readonly prismaService: PrismaService) {}

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
          email: createAccountDto.email,
          passwordHash: hashedPassword,
          name: createAccountDto.name,
          Institution: {
            create: {
              Fields: {
                createMany: {
                  data: [],
                },
              },
              categories: {
                connect: {
                  id: category.id,
                },
              },
              cnpj: createAccountDto.cnpj,
              phone: createAccountDto.phone,
              city: createAccountDto.city,
              state: createAccountDto.state,
            },
          },
        },
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
          Donor: {},
        },
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

  async findAll() {
    return await this.prismaService.donor.findMany();
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
