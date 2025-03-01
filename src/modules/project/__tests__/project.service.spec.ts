import { Test, TestingModule } from '@nestjs/testing'
import {
  ProjectService,
  PostProjectData,
  FavoriteProjectData,
} from '../project.service'
import { PrismaService } from '../../../database/prisma.service'
import { MediaService } from '../../media-attachment/media-attachment.service'
import {
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common'
import { UpdateProjectDto } from '../dto/updateProject.dto'

jest.mock('../../media-attachment/media-attachment.service')

describe('ProjectService', () => {
  let service: ProjectService
  let prismaService: PrismaService
  let mediaService: MediaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: PrismaService,
          useValue: {
            project: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            category: {
              findFirst: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
            },
            favoriteProject: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: MediaService,
          useValue: {
            processMedia: jest.fn(),
            getMediaAttachmentById: jest.fn(),
            getMediaAttachmentsByIds: jest.fn(),
            deleteMediaAttachment: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<ProjectService>(ProjectService)
    prismaService = module.get<PrismaService>(PrismaService)
    mediaService = module.get<MediaService>(MediaService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // Tests for postProjectService
  describe('postProjectService', () => {
    it('should throw an error if file is missing', async () => {
      const data: PostProjectData = {
        description: 'Test description',
        name: 'Test Project',
        category: 'Test Category',
        media: null,
        subtitle: 'Test Subtitle',
        institutionId: 1,
        accountId: 1,
      }

      await expect(service.postProjectService(data)).rejects.toThrow(
        HttpException,
      )
      await expect(service.postProjectService(data)).rejects.toThrow(
        'Um arquivo de mídia é obrigatório para o projeto',
      )
    })

    it('should throw an error if file is not an image', async () => {
      const mockFile: Express.Multer.File = {
        mimetype: 'application/pdf',
        buffer: Buffer.from(''),
        originalname: 'test.pdf',
        fieldname: 'file',
        encoding: '7bit',
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      }

      const data: PostProjectData = {
        description: 'Test description',
        name: 'Test Project',
        category: 'Test Category',
        media: mockFile,
        subtitle: 'Test Subtitle',
        institutionId: 1,
        accountId: 1,
      }

      await expect(service.postProjectService(data)).rejects.toThrow(
        HttpException,
      )
      await expect(service.postProjectService(data)).rejects.toThrow(
        'Apenas arquivos de imagem são permitidos para projetos',
      )
    })

    it('should create a project when valid data is provided', async () => {
      const mockFile: Express.Multer.File = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        fieldname: 'file',
        encoding: '7bit',
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      }

      const data: PostProjectData = {
        description: 'Test description',
        name: 'Test Project',
        category: 'Test Category',
        media: mockFile,
        subtitle: 'Test Subtitle',
        institutionId: 1,
        accountId: 1,
      }

      const existingCategory = { id: 1, name: 'Test Category' }
      const mediaAttachment = { mediaAttachment: { id: 'media-id' } }
      const createdProject = {
        id: 1,
        description: data.description,
        name: data.name,
        subtitle: data.subtitle,
        mediaId: 'media-id',
        categoryId: existingCategory.id,
        institutionId: data.institutionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaService.category.findFirst = jest
        .fn()
        .mockResolvedValue(existingCategory)
      mediaService.processMedia = jest.fn().mockResolvedValue(mediaAttachment)
      prismaService.project.create = jest.fn().mockResolvedValue(createdProject)

      const result = await service.postProjectService(data)

      expect(prismaService.category.findFirst).toHaveBeenCalledWith({
        where: { name: data.category },
      })
      expect(mediaService.processMedia).toHaveBeenCalledWith(mockFile, {
        accountId: data.accountId,
      })
      expect(prismaService.project.create).toHaveBeenCalledWith({
        data: {
          description: data.description,
          name: data.name,
          category: {
            connect: { id: existingCategory.id },
          },
          media: {
            connect: { id: 'media-id' },
          },
          institution: {
            connect: { id: data.institutionId },
          },
          subtitle: data.subtitle,
        },
        select: expect.any(Object),
      })
      expect(result).toEqual(createdProject)
    })

    it('should create a new category if it does not exist', async () => {
      const mockFile: Express.Multer.File = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        fieldname: 'file',
        encoding: '7bit',
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      }

      const data: PostProjectData = {
        description: 'Test description',
        name: 'Test Project',
        category: 'New Category',
        media: mockFile,
        subtitle: 'Test Subtitle',
        institutionId: 1,
        accountId: 1,
      }

      const newCategory = { id: 2, name: 'New Category' }
      const mediaAttachment = { mediaAttachment: { id: 'media-id' } }
      const createdProject = {
        id: 1,
        description: data.description,
        name: data.name,
        subtitle: data.subtitle,
        mediaId: 'media-id',
        categoryId: newCategory.id,
        institutionId: data.institutionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prismaService.category.findFirst = jest.fn().mockResolvedValue(null)
      prismaService.category.create = jest.fn().mockResolvedValue(newCategory)
      mediaService.processMedia = jest.fn().mockResolvedValue(mediaAttachment)
      prismaService.project.create = jest.fn().mockResolvedValue(createdProject)

      const result = await service.postProjectService(data)

      expect(prismaService.category.findFirst).toHaveBeenCalledWith({
        where: { name: data.category },
      })
      expect(prismaService.category.create).toHaveBeenCalledWith({
        data: { name: data.category },
      })
      expect(mediaService.processMedia).toHaveBeenCalledWith(mockFile, {
        accountId: data.accountId,
      })
      expect(prismaService.project.create).toHaveBeenCalledWith({
        data: {
          description: data.description,
          name: data.name,
          category: {
            connect: { id: newCategory.id },
          },
          media: {
            connect: { id: 'media-id' },
          },
          institution: {
            connect: { id: data.institutionId },
          },
          subtitle: data.subtitle,
        },
        select: expect.any(Object),
      })
      expect(result).toEqual(createdProject)
    })

    it('should throw an error if there is an exception during project creation', async () => {
      const mockFile: Express.Multer.File = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        fieldname: 'file',
        encoding: '7bit',
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      }

      const data: PostProjectData = {
        description: 'Test description',
        name: 'Test Project',
        category: 'Test Category',
        media: mockFile,
        subtitle: 'Test Subtitle',
        institutionId: 1,
        accountId: 1,
      }

      prismaService.category.findFirst = jest
        .fn()
        .mockRejectedValue(new Error('Database error'))
      mediaService.processMedia = jest.fn().mockResolvedValue({
        mediaAttachment: { id: 'media-id' },
      })

      await expect(service.postProjectService(data)).rejects.toThrow(Error)
      await expect(service.postProjectService(data)).rejects.toThrow(
        'Database error',
      )
    })
  })

  describe('deleteProjectService', () => {
    it('should delete a project successfully', async () => {
      const projectId = 1
      const accountId = 1

      const existingProject = {
        id: projectId,
        institutionId: 1,
        mediaId: 'media-id',
        institution: {
          accountId: accountId,
        },
      }

      prismaService.project.findUnique = jest
        .fn()
        .mockResolvedValue(existingProject)

      prismaService.project.delete = jest.fn().mockResolvedValue(null)

      mediaService.deleteMediaAttachment = jest.fn().mockResolvedValue(null)

      await expect(
        service.deleteProjectService(projectId, accountId),
      ).resolves.toEqual({ message: 'Projeto deletado com sucesso' })

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { institution: true },
      })

      expect(mediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'media-id',
      )

      expect(prismaService.project.delete).toHaveBeenCalledWith({
        where: { id: projectId },
      })
    })

    it('should throw NotFoundException if project does not exist', async () => {
      const projectId = 1
      const accountId = 1

      prismaService.project.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.deleteProjectService(projectId, accountId),
      ).rejects.toThrow(NotFoundException)

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { institution: true },
      })

      expect(mediaService.deleteMediaAttachment).not.toHaveBeenCalled()
      expect(prismaService.project.delete).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenException if user is not the owner', async () => {
      const projectId = 1
      const accountId = 1

      const existingProject = {
        id: projectId,
        institutionId: 1,
        mediaId: 'media-id',
        institution: {
          accountId: 2, // Different accountId
        },
      }

      prismaService.project.findUnique = jest
        .fn()
        .mockResolvedValue(existingProject)

      await expect(
        service.deleteProjectService(projectId, accountId),
      ).rejects.toThrow(ForbiddenException)

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { institution: true },
      })

      expect(mediaService.deleteMediaAttachment).not.toHaveBeenCalled()
      expect(prismaService.project.delete).not.toHaveBeenCalled()
    })
  })

  describe('updateProjectService', () => {
    it('should update a project successfully without changing media or category', async () => {
      const projectId = 1
      const accountId = 1

      const existingProject = {
        id: projectId,
        institutionId: 1,
        mediaId: 'media-id',
        institution: {
          accountId: accountId,
        },
        categoryId: 1,
      }

      const updateData: UpdateProjectDto & {
        file?: Express.Multer.File
        accountId: number
      } = {
        name: 'Updated Project Name',
        description: 'Updated Description',
        accountId: accountId,
      }

      prismaService.project.findUnique = jest
        .fn()
        .mockResolvedValue(existingProject)

      prismaService.project.update = jest.fn().mockResolvedValue({
        ...existingProject,
        ...updateData,
      })

      mediaService.getMediaAttachmentById = jest.fn().mockResolvedValue({
        mediaResponse: { id: 'media-id', url: 'http://example.com/media.jpg' },
      })

      const result = await service.updateProjectService(projectId, updateData)

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { institution: true },
      })

      expect(prismaService.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: {
          name: updateData.name,
          description: updateData.description,
          media: { connect: { id: 'media-id' } },
          category: undefined,
        },
        select: {
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
        },
      })

      expect(result).toEqual({
        ...existingProject,
        ...updateData,
      })
    })

    it('should update a project and replace media when file is provided', async () => {
      const projectId = 1
      const accountId = 1

      const existingProject = {
        id: projectId,
        institutionId: 1,
        mediaId: 'old-media-id',
        institution: {
          accountId: accountId,
        },
        categoryId: 1,
      }

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'new-image.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        size: 2048,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      }

      const updateData: UpdateProjectDto & {
        file?: Express.Multer.File
        accountId: number
      } = {
        name: 'Updated Project Name',
        description: 'Updated Description',
        file: mockFile,
        accountId: accountId,
      }

      prismaService.project.findUnique = jest
        .fn()
        .mockResolvedValue(existingProject)

      mediaService.deleteMediaAttachment = jest.fn().mockResolvedValue(null)

      mediaService.processMedia = jest
        .fn()
        .mockResolvedValue({ mediaAttachment: { id: 'new-media-id' } })

      prismaService.project.update = jest.fn().mockResolvedValue({
        ...existingProject,
        ...updateData,
        mediaId: 'new-media-id',
      })

      mediaService.getMediaAttachmentById = jest.fn().mockResolvedValue({
        mediaResponse: {
          id: 'new-media-id',
          url: 'http://example.com/new-media.jpg',
        },
      })

      const result = await service.updateProjectService(projectId, updateData)

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { institution: true },
      })

      expect(mediaService.deleteMediaAttachment).toHaveBeenCalledWith(
        'old-media-id',
      )

      expect(mediaService.processMedia).toHaveBeenCalledWith(mockFile, {
        accountId: accountId,
      })

      expect(prismaService.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: {
          name: updateData.name,
          description: updateData.description,
          media: { connect: { id: 'new-media-id' } },
          category: undefined,
        },
        select: {
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
        },
      })

      expect(result).toEqual({
        ...existingProject,
        ...updateData,
        mediaId: 'new-media-id',
      })
    })

    it('should update a project and change category when provided', async () => {
      const projectId = 1
      const accountId = 1

      const existingProject = {
        id: projectId,
        institutionId: 1,
        mediaId: 'media-id',
        institution: {
          accountId: accountId,
        },
        categoryId: 1,
      }

      const updateData: UpdateProjectDto & {
        file?: Express.Multer.File
        accountId: number
      } = {
        category: 'New Category',
        accountId: accountId,
      }

      const newCategory = { id: 2, name: 'New Category' }

      prismaService.project.findUnique = jest
        .fn()
        .mockResolvedValue(existingProject)

      prismaService.category.findFirst = jest.fn().mockResolvedValue(null)

      prismaService.category.create = jest.fn().mockResolvedValue(newCategory)

      prismaService.project.update = jest.fn().mockResolvedValue({
        ...existingProject,
        categoryId: newCategory.id,
      })

      mediaService.getMediaAttachmentById = jest.fn().mockResolvedValue({
        mediaResponse: { id: 'media-id', url: 'http://example.com/media.jpg' },
      })

      const result = await service.updateProjectService(projectId, updateData)

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { institution: true },
      })

      expect(prismaService.category.findFirst).toHaveBeenCalledWith({
        where: { name: 'New Category' },
      })

      expect(prismaService.category.create).toHaveBeenCalledWith({
        data: { name: 'New Category' },
      })

      expect(prismaService.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: {
          media: { connect: { id: 'media-id' } }, // Atualizado
          category: { connect: { id: newCategory.id } },
        },
        select: {
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
              phone: true,
              id: true,
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
        },
      })

      expect(result).toEqual({
        ...existingProject,
        categoryId: newCategory.id,
      })
    })

    it('should throw NotFoundException if project does not exist', async () => {
      const projectId = 1
      const accountId = 1

      const updateData: UpdateProjectDto & {
        file?: Express.Multer.File
        accountId: number
      } = {
        name: 'Updated Project Name',
        accountId: accountId,
      }

      prismaService.project.findUnique = jest.fn().mockResolvedValue(null)

      await expect(
        service.updateProjectService(projectId, updateData),
      ).rejects.toThrow(NotFoundException)

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { institution: true },
      })

      expect(prismaService.project.update).not.toHaveBeenCalled()
      expect(mediaService.processMedia).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenException if user is not the owner', async () => {
      const projectId = 1
      const accountId = 1

      const existingProject = {
        id: projectId,
        institutionId: 1,
        mediaId: 'media-id',
        institution: {
          accountId: 2, // Different accountId
        },
        categoryId: 1,
      }

      const updateData: UpdateProjectDto & {
        file?: Express.Multer.File
        accountId: number
      } = {
        name: 'Updated Project Name',
        accountId: accountId,
      }

      prismaService.project.findUnique = jest
        .fn()
        .mockResolvedValue(existingProject)

      await expect(
        service.updateProjectService(projectId, updateData),
      ).rejects.toThrow(ForbiddenException)

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { institution: true },
      })

      expect(prismaService.project.update).not.toHaveBeenCalled()
      expect(mediaService.processMedia).not.toHaveBeenCalled()
    })
  })

  // Tests for toggleFavoriteService
  describe('toggleFavoriteService', () => {
    it('should create a favorite if it does not exist', async () => {
      const data: FavoriteProjectData = {
        projectId: 1,
        donorId: 1,
      }

      prismaService.favoriteProject.findUnique = jest
        .fn()
        .mockResolvedValue(null)
      prismaService.favoriteProject.create = jest.fn().mockResolvedValue({})

      const result = await service.toggleFavoriteService(data)

      expect(prismaService.favoriteProject.findUnique).toHaveBeenCalledWith({
        where: {
          donorId_projectId: {
            donorId: data.donorId,
            projectId: data.projectId,
          },
        },
      })
      expect(prismaService.favoriteProject.create).toHaveBeenCalledWith({
        data: {
          donorId: data.donorId,
          projectId: data.projectId,
        },
      })
      expect(result).toEqual({
        message: 'Status de favorito alterado com sucesso',
      })
    })

    it('should delete the favorite if it exists', async () => {
      const data: FavoriteProjectData = {
        projectId: 1,
        donorId: 1,
      }

      prismaService.favoriteProject.findUnique = jest.fn().mockResolvedValue({
        donorId: data.donorId,
        projectId: data.projectId,
      })
      prismaService.favoriteProject.delete = jest.fn().mockResolvedValue({})

      const result = await service.toggleFavoriteService(data)

      expect(prismaService.favoriteProject.findUnique).toHaveBeenCalledWith({
        where: {
          donorId_projectId: {
            donorId: data.donorId,
            projectId: data.projectId,
          },
        },
      })
      expect(prismaService.favoriteProject.delete).toHaveBeenCalledWith({
        where: {
          donorId_projectId: {
            donorId: data.donorId,
            projectId: data.projectId,
          },
        },
      })
      expect(result).toEqual({
        message: 'Status de favorito alterado com sucesso',
      })
    })

    it('should throw an error if there is an exception', async () => {
      const data: FavoriteProjectData = {
        projectId: 1,
        donorId: 1,
      }

      prismaService.favoriteProject.findUnique = jest
        .fn()
        .mockRejectedValue(new Error('Database error'))

      await expect(service.toggleFavoriteService(data)).rejects.toThrow(
        HttpException,
      )
      await expect(service.toggleFavoriteService(data)).rejects.toThrow(
        'erro ao favoritar projeto',
      )
    })
  })

  // Tests for getAllProjectsService
  describe('getAllProjectsService', () => {
    it('should return all projects with favorite status when donorId is provided', async () => {
      const donorId = 1
      const allProjects = [
        {
          id: 1,
          name: 'Project 1',
          description: 'Description 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          institutionId: 1,
          subtitle: 'Subtitle 1',
        },
        {
          id: 2,
          name: 'Project 2',
          description: 'Description 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          institutionId: 2,
          subtitle: 'Subtitle 2',
        },
      ]
      const favoriteProjects = [{ projectId: 1 }]

      prismaService.project.findMany = jest.fn().mockResolvedValue(allProjects)
      prismaService.favoriteProject.findMany = jest
        .fn()
        .mockResolvedValue(favoriteProjects)

      const result = await service.getAllProjectsService(donorId)

      expect(prismaService.project.findMany).toHaveBeenCalled()
      expect(prismaService.favoriteProject.findMany).toHaveBeenCalledWith({
        where: { donorId },
        select: { projectId: true },
      })

      expect(result).toEqual([
        {
          ...allProjects[0],
          isFavorite: true,
        },
        {
          ...allProjects[1],
          isFavorite: false,
        },
      ])
    })

    it('should return all projects without favorite status when donorId is not provided', async () => {
      const allProjects = [
        {
          id: 1,
          name: 'Project 1',
          description: 'Description 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          institutionId: 1,
          subtitle: 'Subtitle 1',
        },
        {
          id: 2,
          name: 'Project 2',
          description: 'Description 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          institutionId: 2,
          subtitle: 'Subtitle 2',
        },
      ]

      prismaService.project.findMany = jest.fn().mockResolvedValue(allProjects)

      const result = await service.getAllProjectsService()

      expect(prismaService.project.findMany).toHaveBeenCalled()
      expect(result).toEqual([
        {
          ...allProjects[0],
          isFavorite: false,
        },
        {
          ...allProjects[1],
          isFavorite: false,
        },
      ])
    })
  })

  // Tests for getProjectByIdService
  describe('getProjectByIdService', () => {
    it('should return project with media when project exists', async () => {
      const projectId = 1
      const project = {
        id: projectId,
        name: 'Project 1',
        description: 'Description 1',
        mediaId: 'media-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        institutionId: 1,
        subtitle: 'Subtitle 1',
      }

      prismaService.project.findUnique = jest.fn().mockResolvedValue(project)

      const result = await service.getProjectByIdService(projectId)

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        select: {
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
              phone: true,
              id: true,
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
        },
      })

      expect(result).toEqual({
        ...project,
      })
    })

    it('should throw NotFoundException when project does not exist', async () => {
      const projectId = 1

      prismaService.project.findUnique = jest.fn().mockResolvedValue(null)

      await expect(service.getProjectByIdService(projectId)).rejects.toThrow(
        NotFoundException,
      )
      await expect(service.getProjectByIdService(projectId)).rejects.toThrow(
        'Projeto não encontrado',
      )
    })
  })

  // Tests for getFavoriteProjectService
  describe('getFavoriteProjectService', () => {
    it('should return favorite projects with media', async () => {
      const donorId = 1
      const favoriteProjects = [
        {
          project: {
            id: 1,
            name: 'Project 1',
            description: 'Description 1',
            mediaId: 'media-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            institutionId: 1,
            subtitle: 'Subtitle 1',
          },
        },
      ]
      const mediaResponses = [
        {
          mediaResponse: {
            id: 'media-1',
            url: 'http://example.com/media1.jpg',
          },
        },
      ]

      prismaService.favoriteProject.findMany = jest
        .fn()
        .mockResolvedValue(favoriteProjects)
      mediaService.getMediaAttachmentsByIds = jest
        .fn()
        .mockResolvedValue(mediaResponses)

      const result = await service.getFavoriteProjectService(donorId)

      expect(prismaService.favoriteProject.findMany).toHaveBeenCalledWith({
        where: { donorId },
        include: {
          project: {
            select: {
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
                  phone: true,
                  id: true,
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
            },
          },
        },
      })

      expect(result).toEqual([
        {
          ...favoriteProjects[0].project,
        },
      ])
    })
  })

  // Tests for getProjectsByInstitutionService
  describe('getProjectsByInstitutionService', () => {
    it('should return projects with media for a given institution', async () => {
      const institutionId = 1
      const projects = [
        {
          id: 1,
          name: 'Project 1',
          description: 'Description 1',
          mediaId: 'media-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          institutionId,
          subtitle: 'Subtitle 1',
        },
      ]
      const mediaResponses = [
        {
          mediaResponse: {
            id: 'media-1',
            url: 'http://example.com/media1.jpg',
          },
        },
      ]

      prismaService.project.findMany = jest.fn().mockResolvedValue(projects)
      mediaService.getMediaAttachmentsByIds = jest
        .fn()
        .mockResolvedValue(mediaResponses)

      const result =
        await service.getProjectsByInstitutionService(institutionId)

      expect(prismaService.project.findMany).toHaveBeenCalledWith({
        where: { institutionId },
        select: {
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
              phone: true,
              id: true,
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
        },
      })

      expect(result).toEqual([
        {
          ...projects[0],
        },
      ])
    })

    it('should return an empty array if there are no projects', async () => {
      const institutionId = 1

      prismaService.project.findMany = jest.fn().mockResolvedValue([])

      const result =
        await service.getProjectsByInstitutionService(institutionId)

      expect(prismaService.project.findMany).toHaveBeenCalledWith({
        where: { institutionId },
        select: {
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
        },
      })
      expect(result).toEqual([])
    })
  })

  // Tests for getProjectCategoriesService
  describe('getProjectCategoriesService', () => {
    it('should return categories with at least one project', async () => {
      const categoriesIds = [{ id: 1 }, { id: 2 }]
      const expected = [
        { id: 1, name: 'Category 1' },
        { id: 2, name: 'Category 2' },
      ]

      prismaService.$queryRaw = jest.fn().mockResolvedValue(categoriesIds)
      prismaService.category.findMany = jest.fn().mockResolvedValue(expected)

      const actual = await service.getProjectCategoriesService('')

      expect(prismaService.category.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1, 2],
          },
        },
        orderBy: { name: 'asc' },
      })
      expect(actual).toEqual(expected)
    })
  })
})
