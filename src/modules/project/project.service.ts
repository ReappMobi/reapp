import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { MediaService } from '../media-attachment/media-attachment.service'
import { UpdateProjectDto } from './dto/updateProject.dto'
import { Prisma } from '@prisma/client'

export type PostProjectData = {
  description: string
  name: string
  media: Express.Multer.File
  institutionId: number
  category: string
  subtitle: string
  accountId: number
}

export type FavoriteProjectData = {
  projectId: number
  donorId: number
}

const projectResponseFields = {
  id: true,
  name: true,
  description: true,
  subtitle: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  institution: {
    select: {
      id: true,
      phone: true,
      category: {
        select: {
          name: true,
        },
      },
      account: {
        select: {
          id: true,
          name: true,
          avatarId: true,
          media: true,
        },
      },
    },
  },
  media: true,
  createdAt: true,
  updatedAt: true,
  mediaId: true,
}

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
    media,
    subtitle,
    institutionId,
    accountId,
  }: PostProjectData) {
    if (!description || !name || !category) {
      throw new HttpException(
        'Descrição, nome e categoria são obrigatórios',
        HttpStatus.BAD_REQUEST,
      )
    }

    if (!media) {
      throw new HttpException(
        'Um arquivo de mídia é obrigatório para o projeto',
        HttpStatus.UNPROCESSABLE_ENTITY,
      )
    }

    if (!media.mimetype.startsWith('image/')) {
      throw new HttpException(
        'Apenas arquivos de imagem são permitidos para projetos',
        HttpStatus.UNPROCESSABLE_ENTITY,
      )
    }

    let mediaId: string | null = null

    if (media) {
      const mediaAttachment = await this.mediaService.processMedia(media, {
        accountId,
      })
      mediaId = mediaAttachment.mediaAttachment.id
    }

    let projectCategory = await this.prismaService.category.findFirst({
      where: { name: category },
    })

    if (!projectCategory) {
      projectCategory = await this.prismaService.category.create({
        data: {
          name: category,
        },
      })
    }

    const project = await this.prismaService.project.create({
      data: {
        description,
        name,
        category: {
          connect: {
            id: projectCategory.id,
          },
        },
        media: mediaId ? { connect: { id: mediaId } } : undefined,
        institution: {
          connect: {
            id: institutionId,
          },
        },
        subtitle,
      },
      select: projectResponseFields,
    })

    return project
  }

  async updateProjectService(
    projectId: number,
    updateData: UpdateProjectDto & {
      file?: Express.Multer.File
      accountId: number
    },
  ) {
    const { file, accountId, ...updateFields } = updateData

    // Verifica se o projeto existe
    const existingProject = await this.prismaService.project.findUnique({
      where: { id: projectId },
      include: { institution: true },
    })

    if (!existingProject) {
      throw new NotFoundException('Projeto não encontrado')
    }

    // Verifica se a instituição é a proprietária do projeto
    if (existingProject.institution.accountId !== accountId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este projeto',
      )
    }

    let mediaId = existingProject.mediaId

    // Se um novo arquivo for fornecido, atualiza o media attachment
    if (file) {
      // Opcionalmente, delete o antigo media attachment se necessário
      if (mediaId) {
        await this.mediaService.deleteMediaAttachment(mediaId)
      }

      const mediaAttachment = await this.mediaService.processMedia(file, {
        accountId,
      })
      mediaId = mediaAttachment.mediaAttachment.id
    }

    // Atualiza a categoria se fornecida
    let projectCategory = null
    if (updateFields.category) {
      projectCategory = await this.prismaService.category.findFirst({
        where: { name: updateFields.category },
      })

      if (!projectCategory) {
        projectCategory = await this.prismaService.category.create({
          data: {
            name: updateFields.category,
          },
        })
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
      select: projectResponseFields,
    })

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

    return updatedProject
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
        })

      if (existingFavorite) {
        await this.prismaService.favoriteProject.delete({
          where: {
            donorId_projectId: {
              donorId: donorId,
              projectId: projectId,
            },
          },
        })
      } else {
        await this.prismaService.favoriteProject.create({
          data: {
            projectId: projectId,
            donorId: donorId,
          },
        })
      }

      return { message: 'Status de favorito alterado com sucesso' }
    } catch (_error) {
      throw new HttpException(
        'erro ao favoritar projeto',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async getAllProjectsService(donorId?: number) {
    const allProjects = await this.prismaService.project.findMany({
      select: projectResponseFields,
    })

    let favoriteProjectIds: number[] = []

    if (donorId) {
      const favoriteProjects =
        await this.prismaService.favoriteProject.findMany({
          where: {
            donorId: donorId,
          },
          select: {
            projectId: true,
          },
        })
      favoriteProjectIds = favoriteProjects.map((fp) => fp.projectId)
    }

    const projects = allProjects.map((project) => {
      return {
        ...project,
        isFavorite: favoriteProjectIds.includes(project.id),
      }
    })

    return projects
  }

  async getProjectByIdService(projectId: number) {
    const project = await this.prismaService.project.findUnique({
      where: { id: projectId },
      select: projectResponseFields,
    })

    if (!project) {
      throw new NotFoundException('Projeto não encontrado')
    }

    return project
  }

  async getFavoriteProjectService(donorId: number) {
    const favoriteProjects = await this.prismaService.favoriteProject.findMany({
      where: {
        donorId: donorId,
      },
      include: {
        project: {
          select: projectResponseFields,
        },
      },
    })

    const projects = favoriteProjects.map((favorite) => favorite.project)

    return projects
  }

  async getProjectsByInstitutionService(institutionId: number) {
    const projects = await this.prismaService.project.findMany({
      where: {
        institutionId: institutionId,
      },
      select: projectResponseFields,
    })

    if (projects.length === 0) {
      return []
    }

    return projects
  }

  async getProjectCategoriesService(search: string = '') {
    const sanitizedSearch = search.trim()
    if (sanitizedSearch.length > 100) {
      throw new HttpException(
        'A pesquisa deve ter no máximo 100 caracteres',
        HttpStatus.BAD_REQUEST,
      )
    }

    const query = `%${sanitizedSearch}%`
    const maxResults = 10
    try {
      const ids = await this.prismaService.$queryRaw<{ id: number }[]>(
        Prisma.sql`SELECT id FROM categories WHERE name ILIKE ${query} LIMIT ${maxResults}`,
      )
      const categories = await this.prismaService.category.findMany({
        where: {
          id: {
            in: ids.map((id) => id.id),
          },
        },
        orderBy: { name: 'asc' },
      })
      return categories
    } catch (_error) {
      throw new HttpException(
        'Erro ao buscar categorias',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async deleteProjectService(projectId: number, accountId: number) {
    // Verifica se o projeto existe
    const existingProject = await this.prismaService.project.findUnique({
      where: { id: projectId },
      include: { institution: true },
    })

    if (!existingProject) {
      throw new NotFoundException('Projeto não encontrado')
    }

    // Verifica se a instituição é a proprietária do projeto
    if (existingProject.institution.accountId !== accountId) {
      throw new ForbiddenException(
        'Você não tem permissão para deletar este projeto',
      )
    }

    // Opcionalmente, delete o media attachment associado
    if (existingProject.mediaId) {
      await this.mediaService.deleteMediaAttachment(existingProject.mediaId)
    }

    // Deleta o projeto
    await this.prismaService.project.delete({
      where: { id: projectId },
    })

    return { message: 'Projeto deletado com sucesso' }
  }
}
