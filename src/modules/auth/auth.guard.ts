import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'

import { Request } from 'express'
import { ROLES_KEY } from './docorators/roles.decorator'
import { Role } from './enums/role.enum'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const roles = this.reflector.get<Role[]>(ROLES_KEY, context.getHandler())

    const token = this.extractTokenFromHeader(request)
    if (!token) {
      throw new UnauthorizedException('Nenhum token fornecido')
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      })
      request['user'] = payload.user
    } catch {
      throw new UnauthorizedException('O token fornecido é inválido')
    }
    
    if (!roles) {
      return true
    }

    const userRoles = request['user'].accountType as Role[]
    const hasRole = () => roles.some((role) => userRoles.includes(role))
    if (!hasRole()) {
      throw new UnauthorizedException('O usuário não tem permissão')
    }

    return true
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
