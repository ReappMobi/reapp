import { HttpException, HttpStatus } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import * as PrismaClient from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { OAuth2Client } from 'google-auth-library'
import { PrismaService } from '../../../database/prisma.service'
import { AuthService } from '../auth.service'
import { LoginDto } from '../dto/login.dto'

const mockPrismaService = {
  account: {
    findFirst: jest.fn(),
  },
}

const mockJwtService = {
  sign: jest.fn(),
}

const mockOAuth2Client = {
  verifyIdToken: jest.fn(),
}

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: OAuth2Client, useValue: mockOAuth2Client },
      ],
    }).compile()

    authService = module.get<AuthService>(AuthService)
  })

  it('should be defined', () => {
    expect(authService).toBeDefined()
  })

  describe('validateUser', () => {
    const email = 'test@example.com'
    const password = 'password'

    it('should return user data if email and password are valid', async () => {
      const user = {
        id: 1,
        email,
        passwordHash: await bcrypt.hash(password, 10),
      }
      mockPrismaService.account.findFirst.mockResolvedValue(user)
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => true)

      const result = await authService.validateUser(email, password)
      expect(result).toEqual({ id: 1, email })
    })

    it('should return null if password is invalid', async () => {
      const user = {
        id: 1,
        email,
        passwordHash: await bcrypt.hash(password, 10),
      }
      mockPrismaService.account.findFirst.mockResolvedValue(user)
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => false)

      const result = await authService.validateUser(email, password)
      expect(result).toBeNull()
    })

    it('should return null if user does not exist', async () => {
      mockPrismaService.account.findFirst.mockResolvedValue(null)

      const result = await authService.validateUser(email, password)
      expect(result).toBeNull()
    })
  })

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password',
    }

    it('should throw an error if credentials are invalid', async () => {
      jest.spyOn(authService, 'validateUser').mockResolvedValue(null)

      await expect(authService.login(loginDto)).rejects.toThrowError(
        new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED),
      )
    })

    it('should return token and user if credentials are valid', async () => {
      const user = {
        id: 1,
        email: loginDto.email,
        status: 'ACTIVE',
      } as Partial<PrismaClient.Account>
      jest.spyOn(authService, 'validateUser').mockResolvedValue(user)
      mockJwtService.sign.mockReturnValue('mockToken')

      const result = await authService.login(loginDto)
      expect(result).toEqual({ token: 'mockToken', user })
    })
  })

  //TODO: loginWithGoogle test
})
