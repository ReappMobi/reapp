import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  ParseIntPipe,
  Put,
  Delete,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateProjectDto } from './dto/createProject.dto';
import { UpdateProjectDto } from './dto/updateProject.dto';
import { ProjectService } from './project.service';
import { AccountService } from '../account/account.service';

interface RequestWithUser extends Request {
  user?: { id: number };
}

@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly accountService: AccountService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async postProject(
    @UploadedFile() media: Express.Multer.File,
    @Body() createProjectDto: CreateProjectDto,
    @Req() req: RequestWithUser,
  ) {
    const { description, name, category, subtitle } = createProjectDto;

    const accountId = req.user.id;

    const institution = await this.accountService.findOneInstitution(
      Number(accountId),
    );

    if (institution.account.id != req.user?.id) {
      throw new ForbiddenException('Acesso não autorizado');
    }

    const project = await this.projectService.postProjectService({
      description,
      name,
      media,
      subtitle,
      category,
      institutionId: institution.id,
      accountId: req.user.id,
    });

    return project;
  }

  @Put(':projectId')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async updateProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateProjectDto: UpdateProjectDto,
    @Req() req: RequestWithUser,
  ) {
    const accountId = req.user.id;
    const institution = await this.accountService.findOneInstitution(accountId);

    if (!institution || institution.account.id !== accountId) {
      throw new ForbiddenException('Acesso não autorizado');
    }

    const project = await this.projectService.getProjectByIdService(projectId);

    if (project.institutionId !== institution.id) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este projeto',
      );
    }

    const updatedProject = await this.projectService.updateProjectService(
      projectId,
      {
        ...updateProjectDto,
        file,
        accountId,
      },
    );

    return updatedProject;
  }

  @Post('toggle-favorite/:id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async toggleFavorite(@Param('id') id: string, @Req() req: RequestWithUser) {
    const projectId = Number(id);
    const accountId = req.user.id;
    const donor = await this.accountService.findOneDonor(Number(accountId));
    const result = await this.projectService.toggleFavoriteService({
      projectId,
      donorId: donor.id,
    });
    return result;
  }

  @Get()
  @UseGuards(AuthGuard)
  async getAllProjects(@Req() req: RequestWithUser) {
    const accountId = req.user.id;
    const donor = await this.accountService.findOneDonor(Number(accountId));

    const donorId = donor ? donor.id : null;
    const result = await this.projectService.getAllProjectsService(donorId);

    return result;
  }

  @Get('favorite')
  @UseGuards(AuthGuard)
  async getFavoriteProjects(@Req() req: RequestWithUser) {
    const donor = await this.accountService.findOneDonor(Number(req.user.id));
    const donorId = donor.id;
    const result = await this.projectService.getFavoriteProjectService(donorId);
    return result;
  }

  @Get('categories')
  async getProjectCategories() {
    const result = await this.projectService.getProjectCategoriesService();
    return result;
  }

  @Get(':projectId')
  async getProjectById(@Param('projectId', ParseIntPipe) projectId: number) {
    const result = await this.projectService.getProjectByIdService(projectId);
    return result;
  }

  @Get('institution/:institutionId')
  async getProjectsByInstitution(
    @Param('institutionId', ParseIntPipe) institutionId: number,
  ) {
    const result =
      await this.projectService.getProjectsByInstitutionService(institutionId);
    return result;
  }

  @Delete(':projectId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Req() req: RequestWithUser,
  ) {
    const accountId = req.user.id;
    const institution = await this.accountService.findOneInstitution(accountId);

    if (!institution || institution.account.id !== accountId) {
      throw new ForbiddenException('Acesso não autorizado');
    }

    const project = await this.projectService.getProjectByIdService(projectId);

    if (project.institutionId !== institution.id) {
      throw new ForbiddenException(
        'Você não tem permissão para deletar este projeto',
      );
    }

    await this.projectService.deleteProjectService(projectId, accountId);
  }
}
