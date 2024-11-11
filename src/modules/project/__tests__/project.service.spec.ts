import { Test, TestingModule } from '@nestjs/testing';
import {
  ProjectService,
  PostProjectData,
  FavoriteProjectData,
} from '../project.service';
import { PrismaService } from '../../../database/prisma.service';
import { MediaService } from '../../mediaAttachment/media-attachment.service';
import { HttpException, NotFoundException } from '@nestjs/common';

jest.mock('../../mediaAttachment/media-attachment.service');

describe('ProjectService', () => {
  let service: ProjectService;
  let prismaService: PrismaService;
  let mediaService: MediaService;

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
          },
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    prismaService = module.get<PrismaService>(PrismaService);
    mediaService = module.get<MediaService>(MediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Tests for postProjectService
  describe('postProjectService', () => {
    it('should throw an error if file is missing', async () => {
      const data: PostProjectData = {
        description: 'Test description',
        name: 'Test Project',
        category: 'Test Category',
        file: null,
        subtitle: 'Test Subtitle',
        institutionId: 1,
        accountId: 1,
      };

      await expect(service.postProjectService(data)).rejects.toThrow(
        HttpException,
      );
      await expect(service.postProjectService(data)).rejects.toThrow(
        'File is required',
      );
    });

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
      };

      const data: PostProjectData = {
        description: 'Test description',
        name: 'Test Project',
        category: 'Test Category',
        file: mockFile,
        subtitle: 'Test Subtitle',
        institutionId: 1,
        accountId: 1,
      };

      const existingCategory = { id: 1, name: 'Test Category' };
      const mediaAttachment = { mediaAttachment: { id: 'media-id' } };
      const media = {
        mediaResponse: { id: 'media-id', url: 'http://example.com/media.jpg' },
      };
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
      };

      prismaService.category.findFirst = jest
        .fn()
        .mockResolvedValue(existingCategory);
      mediaService.processMedia = jest.fn().mockResolvedValue(mediaAttachment);
      mediaService.getMediaAttachmentById = jest.fn().mockResolvedValue(media);
      prismaService.project.create = jest
        .fn()
        .mockResolvedValue(createdProject);

      const result = await service.postProjectService(data);

      expect(prismaService.category.findFirst).toHaveBeenCalledWith({
        where: { name: data.category },
      });
      expect(mediaService.processMedia).toHaveBeenCalledWith(mockFile, {
        accountId: data.accountId,
      });
      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'media-id',
      );
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
      });
      expect(result).toEqual({
        ...createdProject,
        media: media.mediaResponse,
      });
    });

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
      };

      const data: PostProjectData = {
        description: 'Test description',
        name: 'Test Project',
        category: 'New Category',
        file: mockFile,
        subtitle: 'Test Subtitle',
        institutionId: 1,
        accountId: 1,
      };

      const newCategory = { id: 2, name: 'New Category' };
      const mediaAttachment = { mediaAttachment: { id: 'media-id' } };
      const media = {
        mediaResponse: { id: 'media-id', url: 'http://example.com/media.jpg' },
      };
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
      };

      prismaService.category.findFirst = jest.fn().mockResolvedValue(null);
      prismaService.category.create = jest.fn().mockResolvedValue(newCategory);
      mediaService.processMedia = jest.fn().mockResolvedValue(mediaAttachment);
      mediaService.getMediaAttachmentById = jest.fn().mockResolvedValue(media);
      prismaService.project.create = jest
        .fn()
        .mockResolvedValue(createdProject);

      const result = await service.postProjectService(data);

      expect(prismaService.category.findFirst).toHaveBeenCalledWith({
        where: { name: data.category },
      });
      expect(prismaService.category.create).toHaveBeenCalledWith({
        data: { name: data.category },
      });
      expect(mediaService.processMedia).toHaveBeenCalledWith(mockFile, {
        accountId: data.accountId,
      });
      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'media-id',
      );
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
      });
      expect(result).toEqual({
        ...createdProject,
        media: media.mediaResponse,
      });
    });

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
      };

      const data: PostProjectData = {
        description: 'Test description',
        name: 'Test Project',
        category: 'Test Category',
        file: mockFile,
        subtitle: 'Test Subtitle',
        institutionId: 1,
        accountId: 1,
      };

      prismaService.category.findFirst = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(service.postProjectService(data)).rejects.toThrow(
        HttpException,
      );
      await expect(service.postProjectService(data)).rejects.toThrow(
        'erro ao criar projeto',
      );
    });
  });

  // Tests for toggleFavoriteService
  describe('toggleFavoriteService', () => {
    it('should create a favorite if it does not exist', async () => {
      const data: FavoriteProjectData = {
        projectId: 1,
        donorId: 1,
      };

      prismaService.favoriteProject.findUnique = jest
        .fn()
        .mockResolvedValue(null);
      prismaService.favoriteProject.create = jest.fn().mockResolvedValue({});

      const result = await service.toggleFavoriteService(data);

      expect(prismaService.favoriteProject.findUnique).toHaveBeenCalledWith({
        where: {
          donorId_projectId: {
            donorId: data.donorId,
            projectId: data.projectId,
          },
        },
      });
      expect(prismaService.favoriteProject.create).toHaveBeenCalledWith({
        data: {
          donorId: data.donorId,
          projectId: data.projectId,
        },
      });
      expect(result).toEqual({
        message: 'Status de favorito alterado com sucesso',
      });
    });

    it('should delete the favorite if it exists', async () => {
      const data: FavoriteProjectData = {
        projectId: 1,
        donorId: 1,
      };

      prismaService.favoriteProject.findUnique = jest.fn().mockResolvedValue({
        donorId: data.donorId,
        projectId: data.projectId,
      });
      prismaService.favoriteProject.delete = jest.fn().mockResolvedValue({});

      const result = await service.toggleFavoriteService(data);

      expect(prismaService.favoriteProject.findUnique).toHaveBeenCalledWith({
        where: {
          donorId_projectId: {
            donorId: data.donorId,
            projectId: data.projectId,
          },
        },
      });
      expect(prismaService.favoriteProject.delete).toHaveBeenCalledWith({
        where: {
          donorId_projectId: {
            donorId: data.donorId,
            projectId: data.projectId,
          },
        },
      });
      expect(result).toEqual({
        message: 'Status de favorito alterado com sucesso',
      });
    });

    it('should throw an error if there is an exception', async () => {
      const data: FavoriteProjectData = {
        projectId: 1,
        donorId: 1,
      };

      prismaService.favoriteProject.findUnique = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      await expect(service.toggleFavoriteService(data)).rejects.toThrow(
        HttpException,
      );
      await expect(service.toggleFavoriteService(data)).rejects.toThrow(
        'erro ao favoritar projeto',
      );
    });
  });

  // Tests for getAllProjectsService
  describe('getAllProjectsService', () => {
    it('should return all projects with media and favorite status when donorId is provided', async () => {
      const donorId = 1;
      const allProjects = [
        {
          id: 1,
          name: 'Project 1',
          description: 'Description 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          institutionId: 1,
          subtitle: 'Subtitle 1',
          mediaId: 'media-1',
        },
        {
          id: 2,
          name: 'Project 2',
          description: 'Description 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          institutionId: 2,
          subtitle: 'Subtitle 2',
          mediaId: 'media-2',
        },
      ];
      const favoriteProjects = [{ projectId: 1 }];
      const mediaResponses = [
        {
          mediaResponse: {
            id: 'media-1',
            url: 'http://example.com/media1.jpg',
          },
        },
        {
          mediaResponse: {
            id: 'media-2',
            url: 'http://example.com/media2.jpg',
          },
        },
      ];

      prismaService.project.findMany = jest.fn().mockResolvedValue(allProjects);
      prismaService.favoriteProject.findMany = jest
        .fn()
        .mockResolvedValue(favoriteProjects);
      mediaService.getMediaAttachmentsByIds = jest
        .fn()
        .mockResolvedValue(mediaResponses);

      const result = await service.getAllProjectsService(donorId);

      expect(prismaService.project.findMany).toHaveBeenCalled();
      expect(prismaService.favoriteProject.findMany).toHaveBeenCalledWith({
        where: { donorId },
        select: { projectId: true },
      });
      expect(mediaService.getMediaAttachmentsByIds).toHaveBeenCalledWith([
        'media-1',
        'media-2',
      ]);

      expect(result).toEqual([
        {
          ...allProjects[0],
          media: mediaResponses[0].mediaResponse,
          isFavorite: true,
        },
        {
          ...allProjects[1],
          media: mediaResponses[1].mediaResponse,
          isFavorite: false,
        },
      ]);
    });

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
          mediaId: 'media-1',
        },
        {
          id: 2,
          name: 'Project 2',
          description: 'Description 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          institutionId: 2,
          subtitle: 'Subtitle 2',
          mediaId: 'media-2',
        },
      ];
      const mediaResponses = [
        {
          mediaResponse: {
            id: 'media-1',
            url: 'http://example.com/media1.jpg',
          },
        },
        {
          mediaResponse: {
            id: 'media-2',
            url: 'http://example.com/media2.jpg',
          },
        },
      ];

      prismaService.project.findMany = jest.fn().mockResolvedValue(allProjects);
      mediaService.getMediaAttachmentsByIds = jest
        .fn()
        .mockResolvedValue(mediaResponses);

      const result = await service.getAllProjectsService();

      expect(prismaService.project.findMany).toHaveBeenCalled();
      expect(mediaService.getMediaAttachmentsByIds).toHaveBeenCalledWith([
        'media-1',
        'media-2',
      ]);

      expect(result).toEqual([
        {
          ...allProjects[0],
          media: mediaResponses[0].mediaResponse,
          isFavorite: false,
        },
        {
          ...allProjects[1],
          media: mediaResponses[1].mediaResponse,
          isFavorite: false,
        },
      ]);
    });
  });

  // Tests for getProjectByIdService
  describe('getProjectByIdService', () => {
    it('should return project with media when project exists', async () => {
      const projectId = 1;
      const project = {
        id: projectId,
        name: 'Project 1',
        description: 'Description 1',
        mediaId: 'media-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        institutionId: 1,
        subtitle: 'Subtitle 1',
      };
      const mediaResponse = {
        mediaResponse: { id: 'media-1', url: 'http://example.com/media1.jpg' },
      };

      prismaService.project.findUnique = jest.fn().mockResolvedValue(project);
      mediaService.getMediaAttachmentById = jest
        .fn()
        .mockResolvedValue(mediaResponse);

      const result = await service.getProjectByIdService(projectId);

      expect(prismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'media-1',
      );

      expect(result).toEqual({
        ...project,
        media: mediaResponse.mediaResponse,
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      const projectId = 1;

      prismaService.project.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getProjectByIdService(projectId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProjectByIdService(projectId)).rejects.toThrow(
        'Projeto não encontrado',
      );
    });
  });

  // Tests for getFavoriteProjectService
  describe('getFavoriteProjectService', () => {
    it('should return favorite projects with media', async () => {
      const donorId = 1;
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
      ];
      const mediaResponses = [
        {
          mediaResponse: {
            id: 'media-1',
            url: 'http://example.com/media1.jpg',
          },
        },
      ];

      prismaService.favoriteProject.findMany = jest
        .fn()
        .mockResolvedValue(favoriteProjects);
      mediaService.getMediaAttachmentsByIds = jest
        .fn()
        .mockResolvedValue(mediaResponses);

      const result = await service.getFavoriteProjectService(donorId);

      expect(prismaService.favoriteProject.findMany).toHaveBeenCalledWith({
        where: { donorId },
        include: { project: true },
      });
      expect(mediaService.getMediaAttachmentsByIds).toHaveBeenCalledWith([
        'media-1',
      ]);

      expect(result).toEqual([
        {
          ...favoriteProjects[0].project,
          media: mediaResponses[0].mediaResponse,
          isFavorite: true,
        },
      ]);
    });
  });

  // Tests for getProjectsByInstitutionService
  describe('getProjectsByInstitutionService', () => {
    it('should return projects with media for a given institution', async () => {
      const institutionId = 1;
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
      ];
      const mediaResponses = [
        {
          mediaResponse: {
            id: 'media-1',
            url: 'http://example.com/media1.jpg',
          },
        },
      ];

      prismaService.project.findMany = jest.fn().mockResolvedValue(projects);
      mediaService.getMediaAttachmentsByIds = jest
        .fn()
        .mockResolvedValue(mediaResponses);

      const result =
        await service.getProjectsByInstitutionService(institutionId);

      expect(prismaService.project.findMany).toHaveBeenCalledWith({
        where: { institutionId },
      });
      expect(mediaService.getMediaAttachmentsByIds).toHaveBeenCalledWith([
        'media-1',
      ]);

      expect(result).toEqual([
        {
          ...projects[0],
          media: mediaResponses[0].mediaResponse,
        },
      ]);
    });

    it('should return an empty array if there are no projects', async () => {
      const institutionId = 1;

      prismaService.project.findMany = jest.fn().mockResolvedValue([]);

      const result =
        await service.getProjectsByInstitutionService(institutionId);

      expect(prismaService.project.findMany).toHaveBeenCalledWith({
        where: { institutionId },
      });
      expect(result).toEqual([]);
    });
  });

  // Tests for getProjectCategoriesService
  describe('getProjectCategoriesService', () => {
    it('should return categories with at least one project', async () => {
      const categories = [
        { id: 1, name: 'Category 1' },
        { id: 2, name: 'Category 2' },
      ];

      prismaService.category.findMany = jest.fn().mockResolvedValue(categories);

      const result = await service.getProjectCategoriesService();

      expect(prismaService.category.findMany).toHaveBeenCalledWith({
        where: {
          projects: {
            some: {},
          },
        },
      });
      expect(result).toEqual(categories);
    });
  });
});
