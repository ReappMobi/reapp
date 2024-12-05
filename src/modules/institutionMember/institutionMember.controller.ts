import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { InstitutionMemberService } from './institutionMember.service';
import { AccountService } from '../account/account.service';
import { AuthGuard } from '../auth/auth.guard';
import { InstitutionMemberType } from '@prisma/client';
import { CreateInstitutionMemberDto } from './dto/createInstitutionMember.dto';
import { UpdateInstitutionMemberDto } from './dto/updateInstitutionMember.dto';

interface RequestWithUser extends Request {
  user?: any;
}

@UseGuards(AuthGuard)
@Controller('institution-members')
export class InstitutionMemberController {
  constructor(
    private readonly institutionMemberService: InstitutionMemberService,
    private readonly accountService: AccountService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createInstitutionMember(
    @Req() request: RequestWithUser,
    @Body() createMemberDto: CreateInstitutionMemberDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const accountId = request.user?.id;

    const institution = await this.accountService.findOneInstitution(
      Number(accountId),
    );

    if (!institution) {
      throw new UnauthorizedException('Instituição não encontrada');
    }

    const institutionId = institution.id;

    const result = await this.institutionMemberService.createInstitutionMember({
      ...createMemberDto,
      institutionId,
      file,
    });

    return result;
  }

  @Get('collaborators/:institutionId')
  async getCollaboratorsByInstitutionId(
    @Param('institutionId', ParseIntPipe) institutionId: number,
  ) {
    const result =
      await this.institutionMemberService.getInstitutionMembersByType(
        institutionId,
        InstitutionMemberType.COLLABORATOR,
      );
    return result;
  }

  @Get('volunteers/:institutionId')
  async getVolunteersByInstitutionId(
    @Param('institutionId', ParseIntPipe) institutionId: number,
  ) {
    const result =
      await this.institutionMemberService.getInstitutionMembersByType(
        institutionId,
        InstitutionMemberType.VOLUNTEER,
      );
    return result;
  }

  @Get('partners/:institutionId')
  async getPartnersByInstitutionId(
    @Param('institutionId', ParseIntPipe) institutionId: number,
  ) {
    const result =
      await this.institutionMemberService.getInstitutionMembersByType(
        institutionId,
        InstitutionMemberType.PARTNER,
      );
    return result;
  }

  @Get('member/:memberId')
  async getInstitutionMemberById(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() request: RequestWithUser,
  ) {
    const accountId = request.user?.id;

    const institution = await this.accountService.findOneInstitution(accountId);

    if (!institution) {
      throw new UnauthorizedException('Instituição não encontrada');
    }

    const member =
      await this.institutionMemberService.findInstitutionMemberById(memberId);

    if (!member) {
      throw new UnauthorizedException('Membro não encontrado');
    }

    if (institution.id !== member.institutionId) {
      throw new UnauthorizedException('Acesso não autorizado');
    }

    return member;
  }

  @Put(':memberId')
  @UseInterceptors(FileInterceptor('file'))
  async updateInstitutionMember(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() request: RequestWithUser,
    @Body() updateMemberDto: UpdateInstitutionMemberDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const accountId = request.user?.id;

    const institution = await this.accountService.findOneInstitution(accountId);

    if (!institution) {
      throw new UnauthorizedException('Instituição não encontrada');
    }

    const member =
      await this.institutionMemberService.findInstitutionMemberById(memberId);

    if (!member) {
      throw new UnauthorizedException('Membro não encontrado');
    }

    if (institution.id !== member.institutionId) {
      throw new UnauthorizedException('Acesso não autorizado');
    }

    const result = await this.institutionMemberService.updateInstitutionMember(
      memberId,
      {
        ...updateMemberDto,
        file,
      },
    );

    return result;
  }

  @Delete(':memberId')
  async deleteInstitutionMember(
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() request: RequestWithUser,
  ) {
    const accountId = request.user?.id;

    const institution = await this.accountService.findOneInstitution(accountId);

    if (!institution) {
      throw new UnauthorizedException('Instituição não encontrada');
    }

    const member =
      await this.institutionMemberService.findInstitutionMemberById(memberId);

    if (!member) {
      throw new UnauthorizedException('Membro não encontrado');
    }

    if (institution.id !== member.institutionId) {
      throw new UnauthorizedException('Acesso não autorizado');
    }

    await this.institutionMemberService.deleteInstitutionMember(memberId);

    return { message: 'Membro deletado com sucesso' };
  }
}
