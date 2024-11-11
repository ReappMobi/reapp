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
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../authentication/authentication.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateProjectDto } from './dto/createProject.dto';
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
    @UploadedFile() file: Express.Multer.File,
    @Body() createProjectDto: CreateProjectDto,
    @Req() req: RequestWithUser,
  ) {
    const { description, name, category, subtitle } = createProjectDto;

    const accountId = req.user.id;

    const institution = await this.accountService.findOneInstitution(
      Number(accountId),
    );

    if (institution.accountId != req.user?.id) {
      throw new ForbiddenException('Acesso não autorizado');
    }

    const project = await this.projectService.postProjectService({
      description,
      name,
      file,
      subtitle,
      category,
      institutionId: institution.id,
      accountId: req.user.id,
    });

    return project;
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
}
