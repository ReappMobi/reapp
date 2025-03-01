import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateAccountDto,
  CreateAccountGoogleDto,
} from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { MediaService } from '../media-attachment/media-attachment.service';

const donorResponseFields = {
  id: true,
  email: true,
  name: true,
  donor: {
    select: {
      donations: true,
      id: true,
    },
  },
  avatarId: true,
  media: true,
  institution: true,
  createdAt: true,
  updatedAt: true,
  accountType: true,
  note: true,
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
  avatarId: true,
  media: true,
  accountType: true,
  note: true,
};

@Injectable()
export class AccountService {
  private client: OAuth2Client;
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
  ) {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  private async createInstitution(
    createAccountDto: CreateAccountDto,
    media?: Express.Multer.File,
  ) {
    const email = createAccountDto.email.toLowerCase();
    const emailExists = await this.prismaService.account.findFirst({
      where: { email },
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

      const hashedPassword = await bcrypt.hash(createAccountDto.password, 10);
      const account = await this.prismaService.account.create({
        data: {
          accountType: 'INSTITUTION',
          email: email,
          passwordHash: hashedPassword,
          name: createAccountDto.name,
          note: createAccountDto.note,
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
          status: 'PENDING',
        },
        select: institutionResponseFields,
      });

      if (media) {
        const mediaAttachment = await this.mediaService.processMedia(media, {
          accountId: account.id,
        });

        const accountWithMedia = await this.prismaService.account.update({
          where: { id: account.id },
          data: {
            avatarId: mediaAttachment.mediaAttachment.id,
          },
          select: donorResponseFields,
        });

        return accountWithMedia;
      }

      return account;
    } catch (error) {
      throw new HttpException(
        'erro ao criar conta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async createDonor(
    createAccountDto: CreateAccountDto,
    media?: Express.Multer.File,
  ) {
    const email = createAccountDto.email.toLowerCase();
    const emailExists = await this.prismaService.account.findFirst({
      where: { email },
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
          email: email,
          passwordHash: hashedPassword,
          name: createAccountDto.name,
          note: createAccountDto.note,
          status: 'ACTIVE',
          donor: {
            create: {},
          },
        },
        select: donorResponseFields,
      });

      if (media) {
        const mediaAttachment = await this.mediaService.processMedia(media, {
          accountId: account.id,
        });

        const accountWithMedia = await this.prismaService.account.update({
          where: { id: account.id },
          data: {
            avatarId: mediaAttachment.mediaAttachment.id,
          },
          select: donorResponseFields,
        });

        return accountWithMedia;
      }

      return account;
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'erro ao criar conta',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(
    createAccountDto: CreateAccountDto,
    media?: Express.Multer.File,
  ) {
    if (createAccountDto.accountType === AccountType.INSTITUTION) {
      return await this.createInstitution(createAccountDto, media);
    }
    return await this.createDonor(createAccountDto, media);
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
    //const avatar = payload['picture'];

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
        avatarId: true,
        media: true,
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

  async findAllCategories() {
    return await this.prismaService.category.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  }

  async findOne(id: number) {
    const account = await this.prismaService.account.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
        avatarId: true,
        media: true,
        note: true,
      },
    });

    if (!account) {
      throw new HttpException('conta não encontrada', HttpStatus.NOT_FOUND);
    }

    return account;
  }

  async findAllInstitutions(followerId: number) {
    const allInstitutions = await this.prismaService.institution.findMany({
      select: {
        id: true,
        cnpj: true,
        phone: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        fields: true,
        account: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarId: true,
            media: true,
            followersCount: true,
          },
        },
      },
    });

    const institutionsWithFollowStatus = await Promise.all(
      allInstitutions.map(async (institution) => {
        const isFollowing = await this.prismaService.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId,
              followingId: institution.account.id,
            },
          },
        });

        return {
          ...institution,
          isFollowing: Boolean(isFollowing),
        };
      }),
    );

    return institutionsWithFollowStatus;
  }

  async findOneInstitution(id: number, followerId: number = undefined) {
    const institutionAccount = await this.prismaService.institution.findUnique({
      where: { accountId: id },
      select: {
        id: true,
        cnpj: true,
        phone: true,
        category: {
          select: {
            name: true,
          },
        },
        fields: true,
        account: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarId: true,
            media: true,
            followersCount: true,
          },
        },
      },
    });

    if (!institutionAccount) {
      throw new HttpException(
        'conta da instituição não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    let isFollowing = false;
    if (followerId) {
      isFollowing = Boolean(
        await this.prismaService.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId,
              followingId: id,
            },
          },
        }),
      );
    }
    return {
      ...institutionAccount,
      isFollowing: isFollowing,
    };
  }

  async findOneDonor(id: number) {
    const donorAccount = await this.prismaService.donor.findUnique({
      where: { accountId: id },
      select: {
        id: true,
        account: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarId: true,
            media: true,
            note: true,
          },
        },
        donations: true,
      },
    });
    return donorAccount;
  }

  async remove(accountId: number, id: number) {
    const account = await this.prismaService.account.findUnique({
      where: { id: accountId },
      include: {
        institution: true,
        donor: true,
      },
    });

    if (!account) {
      throw new HttpException('Conta não encontrada', HttpStatus.NOT_FOUND);
    }

    if (account.id !== id) {
      throw new HttpException('Acesso não autorizado', HttpStatus.UNAUTHORIZED);
    }

    if (account.avatarId) {
      await this.mediaService.deleteMediaAttachment(account.avatarId);
    }

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

  async update(
    accountId: number,
    updateAccountDto: UpdateAccountDto,
    media?: Express.Multer.File,
  ) {
    const account = await this.prismaService.account.findUnique({
      where: { id: accountId },
      include: {
        institution: true,
        donor: true,
      },
    });

    if (!account) {
      throw new HttpException('Conta não encontrada', HttpStatus.NOT_FOUND);
    }

    const data: any = {};

    if (updateAccountDto.name) {
      data.name = updateAccountDto.name;
    }

    if (updateAccountDto.note) {
      data.note = updateAccountDto.note;
    }

    if (
      updateAccountDto.password &&
      updateAccountDto.password == updateAccountDto.confirmPassword
    ) {
      const hashedPassword = await bcrypt.hash(updateAccountDto.password, 10);
      data.passwordHash = hashedPassword;
    }

    const mediaId = account.avatarId;
    if (media) {
      if (mediaId) {
        await this.mediaService.deleteMediaAttachment(mediaId);
      }

      const mediaAttachment = await this.mediaService.processMedia(media, {
        accountId,
      });

      data.avatarId = mediaAttachment.mediaAttachment.id;
    }

    if (account.accountType === AccountType.INSTITUTION) {
      const institutionData: any = {};

      if (updateAccountDto.phone) {
        institutionData.phone = updateAccountDto.phone;
      }

      if (updateAccountDto.category) {
        let category = await this.prismaService.category.findFirst({
          where: { name: updateAccountDto.category },
        });

        if (!category) {
          category = await this.prismaService.category.create({
            data: {
              name: updateAccountDto.category,
            },
          });
        }

        institutionData.category = {
          connect: {
            id: category.id,
          },
        };
      }

      if (Object.keys(institutionData).length > 0) {
        data.institution = {
          update: institutionData,
        };
      }
    }

    const updatedAccount = await this.prismaService.account.update({
      where: { id: accountId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
        avatarId: true,
        media: true,
        note: true,
        institution: account.accountType === AccountType.INSTITUTION && {
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

    return updatedAccount;
  }

  async followAccount(followerId: number, followingId: number) {
    const existRegister = await this.prismaService.follow.findFirst({
      where: { followerId: followerId, followingId: followingId },
    });

    if (existRegister) {
      throw new HttpException(
        `O usuário já segue essa conta`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingFollowingAccount = await this.prismaService.account.findFirst(
      {
        where: { id: followingId },
      },
    );

    if (!existingFollowingAccount) {
      throw new HttpException(
        `Conta com ID ${followerId} não encontrada`,
        HttpStatus.NOT_FOUND,
      );
    }

    const existingFollowerAccount = await this.prismaService.account.findFirst({
      where: { id: followerId },
    });

    if (!existingFollowerAccount) {
      throw new HttpException(
        `Conta com ID ${followerId} não encontrada`,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prismaService.account.update({
      where: { id: followerId },
      data: { followingCount: { increment: 1 } },
    });

    await this.prismaService.account.update({
      where: { id: followingId },
      data: { followersCount: { increment: 1 } },
    });

    return this.prismaService.follow.create({
      data: {
        followerId,
        followingId,
      },
    });
  }

  async unfollowAccount(followerId: number, followingId: number) {
    const existRegister = await this.prismaService.follow.findFirst({
      where: { followerId: followerId, followingId: followingId },
    });

    if (!existRegister) {
      throw new HttpException(
        `O usuário já segue essa conta`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingFollowingAccount = await this.prismaService.account.findFirst(
      {
        where: { id: followingId },
      },
    );

    if (!existingFollowingAccount) {
      throw new HttpException(
        `Conta com ID ${followerId} não encontrada`,
        HttpStatus.NOT_FOUND,
      );
    }

    const existingFollowerAccount = await this.prismaService.account.findFirst({
      where: { id: followerId },
    });

    if (!existingFollowerAccount) {
      throw new HttpException(
        `Conta com ID ${followerId} não encontrada`,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prismaService.account.update({
      where: { id: followerId },
      data: { followingCount: { decrement: 1 } },
    });

    await this.prismaService.account.update({
      where: { id: followingId },
      data: { followersCount: { decrement: 1 } },
    });

    return this.prismaService.follow.delete({
      where: { id: existRegister.id },
    });
  }
}
