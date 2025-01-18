import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginGoogleDto } from './dto/loginGoogle.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

const authResponseFields = {
  id: true,
  email: true,
  name: true,
  media: true,
  accountType: true,
  followingCount: true,
  followersCount: true,
  note: true,
};
@Injectable()
export class AuthService {
  private client: OAuth2Client;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  private async generateJwtToken(user: any): Promise<string> {
    const jwtSecretKey = process.env.JWT_SECRET;
    if (!jwtSecretKey) {
      throw new HttpException(
        'Ocorreu um erro ao autenticar o usuário',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return this.jwtService.sign(
      { id: user.id },
      { secret: jwtSecretKey, expiresIn: '7d' },
    );
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prismaService.account.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        media: true,
        accountType: true,
        followingCount: true,
        followersCount: true,
        note: true,
        passwordHash: true,
      },
    });

    if (user) {
      const { passwordHash, ...result } = user;
      if (await bcrypt.compare(password, passwordHash)) {
        return result;
      }
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED);
    }

    const token = await this.generateJwtToken(user);
    return { token, user };
  }

  async loginWithGoogle(loginGoogleDto: LoginGoogleDto) {
    const { idToken } = loginGoogleDto;

    const ticket = await this.client.verifyIdToken({ idToken });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new HttpException(
        'Autenticação com Google falhou',
        HttpStatus.BAD_REQUEST,
      );
    }

    const email = payload?.email;
    const user = await this.prismaService.account.findFirst({
      where: { email },
      select: authResponseFields,
    });

    if (!user) {
      throw new HttpException(
        'Usuário não encontrado',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = await this.generateJwtToken(user);
    return { token, user };
  }
}
