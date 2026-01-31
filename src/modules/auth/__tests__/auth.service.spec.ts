import { HttpException, HttpStatus } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { Account } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaService } from '../../../database/prisma.service'
import { AuthService } from '../auth.service'
import { LoginDto } from '../dto/login.dto'

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
  compare: vi.fn(),
}))

const mockPrismaService = {
  account: {
    findFirst: vi.fn(),
  },
}

const mockJwtService = {
  sign: vi.fn(),
}

const mockOAuth2Client = {
  verifyIdToken: vi.fn(),
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
        passwordHash: 'hashed_password',
      }
      mockPrismaService.account.findFirst.mockResolvedValue(user)
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const result = await authService.validateUser(email, password)
      expect(result).toEqual({ id: 1, email })
    })

    it('should return null if password is invalid', async () => {
      const user = {
        id: 1,
        email,
        passwordHash: 'hashed_password',
      }
      mockPrismaService.account.findFirst.mockResolvedValue(user)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

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
      vi.spyOn(authService, 'validateUser').mockResolvedValue(null)

      await expect(authService.login(loginDto)).rejects.toThrowError(
        new HttpException('Credenciais inválidas', HttpStatus.UNAUTHORIZED),
      )
    })

    it('should return token and user if credentials are valid', async () => {
      const user = {
        id: 1,
        email: loginDto.email,
        status: 'ACTIVE',
      } as Partial<Account>
      vi.spyOn(authService, 'validateUser').mockResolvedValue(user)
      mockJwtService.sign.mockReturnValue('mockToken')

      const result = await authService.login(loginDto)
      expect(result).toEqual({ token: 'mockToken', user })
    })
  })

  //TODO: loginWithGoogle test
})
