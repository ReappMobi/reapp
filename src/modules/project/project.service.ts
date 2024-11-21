import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MediaService } from '../mediaAttachment/media-attachment.service';
import { UpdateProjectDto } from './dto/updateProject.dto';

export type PostProjectData = {
  description: string;
  name: string;
  file: Express.Multer.File;
  institutionId: number;
  category: string;
  subtitle: string;
  accountId: number;
};

export type FavoriteProjectData = {
  projectId: number;
  donorId: number;
};

@Injectable()
export class ProjectService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async postProjectService({
    description,
    name,
    category,
    file,
    subtitle,
    institutionId,
    accountId,
  }: PostProjectData) {
    if (!file) {
      throw new HttpException(
        'File is required',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      let projectCategory = await this.prismaService.category.findFirst({
        where: { name: category },
      });

      if (!projectCategory) {
        projectCategory = await this.prismaService.category.create({
          data: {
            name: category,
          },
        });
      }

      const mediaAttachment = await this.mediaService.processMedia(file, {
        accountId,
      });

      const mediaId = mediaAttachment.mediaAttachment.id;

      const media = (await this.mediaService.getMediaAttachmentById(mediaId))
        .mediaResponse;

      const project = await this.prismaService.project.create({
        data: {
          description,
          name,
          category: {
            connect: {
              id: projectCategory.id,
            },
          },
          media: {
            connect: {
              id: mediaId,
            },
          },
          institution: {
            connect: {
              id: institutionId,
            },
          },
          subtitle,
        },
      });
      return {
        ...project,
        media,
      };
    } catch (error) {
      throw new HttpException(
        'erro ao criar projeto',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateProjectService(
    projectId: number,
    updateData: UpdateProjectDto & {
      file?: Express.Multer.File;
      accountId: number;
    },
  ) {
    const { file, accountId, ...updateFields } = updateData;

    // Verifica se o projeto existe
    const existingProject = await this.prismaService.project.findUnique({
      where: { id: projectId },
      include: { institution: true },
    });

    if (!existingProject) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Verifica se a instituição é a proprietária do projeto
    if (existingProject.institution.accountId !== accountId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este projeto',
      );
    }

    let mediaId = existingProject.mediaId;

    // Se um novo arquivo for fornecido, atualiza o media attachment
    if (file) {
      // Opcionalmente, delete o antigo media attachment se necessário
      if (mediaId) {
        await this.mediaService.deleteMediaAttachment(mediaId);
      }

      const mediaAttachment = await this.mediaService.processMedia(file, {
        accountId,
      });
      mediaId = mediaAttachment.mediaAttachment.id;
    }

    // Atualiza a categoria se fornecida
    let projectCategory = null;
    if (updateFields.category) {
      projectCategory = await this.prismaService.category.findFirst({
        where: { name: updateFields.category },
      });

      if (!projectCategory) {
        projectCategory = await this.prismaService.category.create({
          data: {
            name: updateFields.category,
          },
        });
      }
    }

    // Atualiza o projeto
    const updatedProject = await this.prismaService.project.update({
      where: { id: projectId },
      data: {
        ...updateFields,
        media: mediaId ? { connect: { id: mediaId } } : undefined,
        category: projectCategory
          ? { connect: { id: projectCategory.id } }
          : undefined,
      },
    });

    /*
    const project = await this.prismaService.project.create({
      data: {
        description,
        name,
        category: {
          connect: {
            id: projectCategory.id,
          },
        },
        media: {
          connect: {
            id: mediaId,
          },
        },
        institution: {
          connect: {
            id: institutionId,
          },
        },
        subtitle,
      },
    });
    return {
      ...project,
      media,
    };

    */

    // Obtém o media atualizado
    const media = mediaId
      ? (await this.mediaService.getMediaAttachmentById(mediaId)).mediaResponse
      : null;

    return {
      ...updatedProject,
      media,
    };
  }

  async toggleFavoriteService({ projectId, donorId }: FavoriteProjectData) {
    try {
      const existingFavorite =
        await this.prismaService.favoriteProject.findUnique({
          where: {
            donorId_projectId: {
              donorId: donorId,
              projectId: projectId,
            },
          },
        });

      if (existingFavorite) {
        await this.prismaService.favoriteProject.delete({
          where: {
            donorId_projectId: {
              donorId: donorId,
              projectId: projectId,
            },
          },
        });
      } else {
        await this.prismaService.favoriteProject.create({
          data: {
            projectId: projectId,
            donorId: donorId,
          },
        });
      }

      return { message: 'Status de favorito alterado com sucesso' };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'erro ao favoritar projeto',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllProjectsService(donorId?: number) {
    const allProjects = await this.prismaService.project.findMany();

    let favoriteProjectIds: number[] = [];

    if (donorId) {
      const favoriteProjects =
        await this.prismaService.favoriteProject.findMany({
          where: {
            donorId: donorId,
          },
          select: {
            projectId: true,
          },
        });
      favoriteProjectIds = favoriteProjects.map((fp) => fp.projectId);
    }

    const mediaIds = Array.from(
      new Set(
        allProjects
          .map((project) => project.mediaId)
          .filter((mediaId): mediaId is string => mediaId !== null),
      ),
    );

    const mediaResponses =
      await this.mediaService.getMediaAttachmentsByIds(mediaIds);

    const mediaMap = new Map<string, any>();
    mediaResponses.forEach((mediaResponseObj) => {
      if (mediaResponseObj.mediaResponse) {
        mediaMap.set(
          mediaResponseObj.mediaResponse.id,
          mediaResponseObj.mediaResponse,
        );
      }
    });

    const projects = allProjects.map((project) => {
      const media = project.mediaId ? mediaMap.get(project.mediaId) : null;
      return {
        ...project,
        media,
        isFavorite: favoriteProjectIds.includes(project.id),
      };
    });

    return projects;
  }

  async getProjectByIdService(projectId: number) {
    const project = await this.prismaService.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Projeto não encontrado');
    }

    let media = null;
    if (project.mediaId) {
      const mediaResult = await this.mediaService.getMediaAttachmentById(
        project.mediaId,
      );
      media = mediaResult.mediaResponse;
    }

    const projectWithMedia = {
      ...project,
      media,
    };

    return projectWithMedia;
  }

  async getFavoriteProjectService(donorId: number) {
    const favoriteProjects = await this.prismaService.favoriteProject.findMany({
      where: {
        donorId: donorId,
      },
      include: {
        project: true,
      },
    });

    const projects = favoriteProjects.map((favorite) => favorite.project);

    const mediaIds = Array.from(
      new Set(
        projects
          .map((project) => project.mediaId)
          .filter((mediaId): mediaId is string => mediaId !== null),
      ),
    );

    const mediaResponses =
      await this.mediaService.getMediaAttachmentsByIds(mediaIds);

    const mediaMap = new Map<string, any>();
    mediaResponses.forEach((mediaResponseObj) => {
      if (mediaResponseObj.mediaResponse) {
        mediaMap.set(
          mediaResponseObj.mediaResponse.id,
          mediaResponseObj.mediaResponse,
        );
      }
    });

    const projectsWithMedia = projects.map((project) => {
      const media = project.mediaId ? mediaMap.get(project.mediaId) : null;
      return {
        ...project,
        media,
        isFavorite: true,
      };
    });

    return projectsWithMedia;
  }

  async getProjectsByInstitutionService(institutionId: number) {
    const projects = await this.prismaService.project.findMany({
      where: {
        institutionId: institutionId,
      },
    });

    if (projects.length === 0) {
      return [];
    }

    const mediaIds = Array.from(
      new Set(
        projects
          .map((project) => project.mediaId)
          .filter((mediaId): mediaId is string => mediaId !== null),
      ),
    );

    const mediaResponses =
      await this.mediaService.getMediaAttachmentsByIds(mediaIds);

    const mediaMap = new Map<string, any>();
    mediaResponses.forEach((mediaResponseObj) => {
      if (mediaResponseObj.mediaResponse) {
        mediaMap.set(
          mediaResponseObj.mediaResponse.id,
          mediaResponseObj.mediaResponse,
        );
      }
    });

    const projectsWithMedia = projects.map((project) => {
      const media = project.mediaId ? mediaMap.get(project.mediaId) : null;
      return {
        ...project,
        media,
      };
    });

    return projectsWithMedia;
  }

  async getProjectCategoriesService() {
    const categories = await this.prismaService.category.findMany({
      where: {
        projects: {
          some: {},
        },
      },
    });

    return categories;
  }

  async deleteProjectService(projectId: number, accountId: number) {
    // Verifica se o projeto existe
    const existingProject = await this.prismaService.project.findUnique({
      where: { id: projectId },
      include: { institution: true },
    });

    if (!existingProject) {
      throw new NotFoundException('Projeto não encontrado');
    }

    // Verifica se a instituição é a proprietária do projeto
    if (existingProject.institution.accountId !== accountId) {
      throw new ForbiddenException(
        'Você não tem permissão para deletar este projeto',
      );
    }

    // Opcionalmente, delete o media attachment associado
    if (existingProject.mediaId) {
      await this.mediaService.deleteMediaAttachment(existingProject.mediaId);
    }

    // Deleta o projeto
    await this.prismaService.project.delete({
      where: { id: projectId },
    });

    return { message: 'Projeto deletado com sucesso' };
  }
}
