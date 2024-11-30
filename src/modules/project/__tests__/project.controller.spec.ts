import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from '../project.controller';
import { ProjectService } from '../project.service';
import { AccountService } from '../../account/account.service';
import { AuthGuard } from '../../auth/auth.guard';
import { ForbiddenException } from '@nestjs/common';
import { UpdateProjectDto } from '../dto/updateProject.dto';

describe('ProjectController', () => {
  let controller: ProjectController;
  let projectService: ProjectService;
  let accountService: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: {
            postProjectService: jest.fn(),
            toggleFavoriteService: jest.fn(),
            getAllProjectsService: jest.fn(),
            getFavoriteProjectService: jest.fn(),
            getProjectCategoriesService: jest.fn(),
            getProjectByIdService: jest.fn(),
            getProjectsByInstitutionService: jest.fn(),
            updateProjectService: jest.fn(),
            deleteProjectService: jest.fn(),
          },
        },
        {
          provide: AccountService,
          useValue: {
            findOneInstitution: jest.fn(),
            findOneDonor: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<ProjectController>(ProjectController);
    projectService = module.get<ProjectService>(ProjectService);
    accountService = module.get<AccountService>(AccountService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('postProject', () => {
    it('should create a project and return it', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const createProjectDto = {
        description: 'Test project description',
        name: 'Test Project',
        category: '1',
        subtitle: 'Test Subtitle',
      };

      const accountId = 1;
      const institution = {
        id: 1,
        accountId: accountId,
        cnpj: '12345678901234',
        phone: '1234567890',
        categoryId: 2,
      };
      const req = { user: { id: accountId } };

      const project = {
        id: 1,
        description: 'Test project description',
        name: 'Test Project',
        category: '1',
        subtitle: 'Test Subtitle',
        media: {
          id: 'media-id',
          type: 'image',
          url: 'http://example.com/image.jpg',
          preview_url: 'http://example.com/preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: 'Media description',
          blurhash: 'blurhash-string',
        },
        mediaId: 'media-id',
        institutionId: institution.id,
        categoryId: parseInt(createProjectDto.category),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution);
      jest
        .spyOn(projectService, 'postProjectService')
        .mockResolvedValue(project);

      const result = await controller.postProject(
        mockFile,
        createProjectDto,
        req as any,
      );

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(accountId);
      expect(projectService.postProjectService).toHaveBeenCalledWith({
        ...createProjectDto,
        file: mockFile,
        institutionId: institution.id,
        accountId: req.user.id,
      });
      expect(result).toEqual(project);
    });

    it('should throw ForbiddenException if institution accountId does not match user id', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const createProjectDto = {
        description: 'Test project description',
        name: 'Test Project',
        category: '1',
        subtitle: 'Test Subtitle',
      };

      const accountId = 1;
      const institution = {
        id: 1,
        accountId: 2,
        cnpj: '12345678901234',
        phone: '1234567890',
        categoryId: 2,
      };
      const req = { user: { id: accountId } };

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution);

      await expect(
        controller.postProject(mockFile, createProjectDto, req as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateProject', () => {
    it('should update a project and return it', async () => {
      const projectId = 1;
      const accountId = 1;
      const institution = {
        id: 1,
        accountId: accountId,
        cnpj: '12345678901234',
        phone: '1234567890',
        categoryId: 2,
      };
      const project = {
        id: projectId,
        name: 'Old Project Name',
        description: 'Old Description',
        subtitle: 'Old Subtitle',
        categoryId: 1,
        institutionId: institution.id,
        mediaId: 'old-media-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        media: {
          id: 'old-media-id',
          type: 'image',
          url: 'http://example.com/old-image.jpg',
          preview_url: 'http://example.com/old-preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: 'Old Media description',
          blurhash: 'old-blurhash-string',
        },
      };

      const updatedProjectData: UpdateProjectDto = {
        name: 'New Project Name',
        description: 'New Description',
        subtitle: 'New Subtitle',
        category: 'New Category',
      };

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const updatedProject = {
        ...project,
        ...updatedProjectData,
        media: {
          id: 'new-media-id',
          type: 'image',
          url: 'http://example.com/new-image.jpg',
          preview_url: 'http://example.com/new-preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: 'New Media description',
          blurhash: 'new-blurhash-string',
        },
        mediaId: 'new-media-id',
      };

      const req = { user: { id: accountId } };

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution);
      jest
        .spyOn(projectService, 'getProjectByIdService')
        .mockResolvedValue(project);
      jest
        .spyOn(projectService, 'updateProjectService')
        .mockResolvedValue(updatedProject);

      const result = await controller.updateProject(
        projectId,
        mockFile,
        updatedProjectData,
        req as any,
      );

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(accountId);
      expect(projectService.getProjectByIdService).toHaveBeenCalledWith(
        projectId,
      );
      expect(projectService.updateProjectService).toHaveBeenCalledWith(
        projectId,
        {
          ...updatedProjectData,
          file: mockFile,
          accountId,
        },
      );
      expect(result).toEqual(updatedProject);
    });

    it('should throw ForbiddenException if institution accountId does not match user id', async () => {
      const projectId = 1;
      const accountId = 1;
      const institution = {
        id: 1,
        accountId: 2, // accountId diferente
        cnpj: '12345678901234',
        phone: '1234567890',
        categoryId: 2,
      };

      const updatedProjectData: UpdateProjectDto = {
        name: 'New Project Name',
      };

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const req = { user: { id: accountId } };

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution);

      await expect(
        controller.updateProject(
          projectId,
          mockFile,
          updatedProjectData,
          req as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(accountId);
      expect(projectService.getProjectByIdService).not.toHaveBeenCalled();
      expect(projectService.updateProjectService).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if project institutionId does not match institution id', async () => {
      const projectId = 1;
      const accountId = 1;
      const institution = {
        id: 1,
        accountId: accountId,
        cnpj: '12345678901234',
        phone: '1234567890',
        categoryId: 2,
      };
      const project = {
        id: projectId,
        name: 'Old Project Name',
        description: 'Old Description',
        subtitle: 'Old Subtitle',
        categoryId: 1,
        institutionId: 2,
        mediaId: 'old-media-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        media: {
          id: 'old-media-id',
          type: 'image',
          url: 'http://example.com/old-image.jpg',
          preview_url: 'http://example.com/old-preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: 'Old Media description',
          blurhash: 'old-blurhash-string',
        },
      };

      const updatedProjectData: UpdateProjectDto = {
        name: 'New Project Name',
      };

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const req = { user: { id: accountId } };

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution);
      jest
        .spyOn(projectService, 'getProjectByIdService')
        .mockResolvedValue(project);

      await expect(
        controller.updateProject(
          projectId,
          mockFile,
          updatedProjectData,
          req as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(accountId);
      expect(projectService.getProjectByIdService).toHaveBeenCalledWith(
        projectId,
      );
      expect(projectService.updateProjectService).not.toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const projectId = 1;
      const accountId = 1;
      const institution = {
        id: 1,
        accountId: accountId,
        cnpj: '12345678901234',
        phone: '1234567890',
        categoryId: 2,
      };
      const project = {
        id: projectId,
        name: 'Project Name',
        description: 'Description',
        subtitle: 'Subtitle',
        categoryId: 1,
        institutionId: institution.id,
        mediaId: 'media-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        media: {
          id: 'old-media-id',
          type: 'image',
          url: 'http://example.com/old-image.jpg',
          preview_url: 'http://example.com/old-preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: 'Old Media description',
          blurhash: 'old-blurhash-string',
        },
      };

      const req = { user: { id: accountId } };

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution);
      jest
        .spyOn(projectService, 'getProjectByIdService')
        .mockResolvedValue(project);
      jest
        .spyOn(projectService, 'deleteProjectService')
        .mockResolvedValue({ message: 'Projeto deletado com sucesso' });

      const result = await controller.deleteProject(projectId, req as any);

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(accountId);
      expect(projectService.getProjectByIdService).toHaveBeenCalledWith(
        projectId,
      );
      expect(projectService.deleteProjectService).toHaveBeenCalledWith(
        projectId,
        accountId,
      );
      expect(result).toBeUndefined();
    });

    it('should throw ForbiddenException if institution accountId does not match user id', async () => {
      const projectId = 1;
      const accountId = 1;
      const institution = {
        id: 1,
        accountId: 2, // accountId diferente
        cnpj: '12345678901234',
        phone: '1234567890',
        categoryId: 2,
      };

      const req = { user: { id: accountId } };

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution);

      await expect(
        controller.deleteProject(projectId, req as any),
      ).rejects.toThrow(ForbiddenException);

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(accountId);
      expect(projectService.getProjectByIdService).not.toHaveBeenCalled();
      expect(projectService.deleteProjectService).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if project institutionId does not match institution id', async () => {
      const projectId = 1;
      const accountId = 1;
      const institution = {
        id: 1,
        accountId: accountId,
        cnpj: '12345678901234',
        phone: '1234567890',
        categoryId: 2,
      };
      const project = {
        id: projectId,
        name: 'Project Name',
        description: 'Description',
        subtitle: 'Subtitle',
        categoryId: 1,
        institutionId: 2, // institutionId diferente
        mediaId: 'media-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        media: {
          id: 'old-media-id',
          type: 'image',
          url: 'http://example.com/old-image.jpg',
          preview_url: 'http://example.com/old-preview.jpg',
          remote_url: null,
          text_url: null,
          meta: null,
          description: 'Old Media description',
          blurhash: 'old-blurhash-string',
        },
      };

      const req = { user: { id: accountId } };

      jest
        .spyOn(accountService, 'findOneInstitution')
        .mockResolvedValue(institution);
      jest
        .spyOn(projectService, 'getProjectByIdService')
        .mockResolvedValue(project);

      await expect(
        controller.deleteProject(projectId, req as any),
      ).rejects.toThrow(ForbiddenException);

      expect(accountService.findOneInstitution).toHaveBeenCalledWith(accountId);
      expect(projectService.getProjectByIdService).toHaveBeenCalledWith(
        projectId,
      );
      expect(projectService.deleteProjectService).not.toHaveBeenCalled();
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite and return the result', async () => {
      const projectId = '1';
      const accountId = 1;
      const donor = { id: 2, accountId: accountId };
      const req = { user: { id: accountId } };
      const toggleResult = { message: 'Favorite toggled' };

      jest.spyOn(accountService, 'findOneDonor').mockResolvedValue(donor);
      jest
        .spyOn(projectService, 'toggleFavoriteService')
        .mockResolvedValue(toggleResult);

      const result = await controller.toggleFavorite(projectId, req as any);

      expect(accountService.findOneDonor).toHaveBeenCalledWith(accountId);
      expect(projectService.toggleFavoriteService).toHaveBeenCalledWith({
        projectId: Number(projectId),
        donorId: donor.id,
      });
      expect(result).toEqual(toggleResult);
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects', async () => {
      const accountId = 1;
      const donor = { id: 2, accountId: accountId };
      const req = { user: { id: accountId } };
      const projects = [
        {
          id: 1,
          name: 'Project 1',
          description: 'Description of Project 1',
          mediaId: 'media-id-1',
          institutionId: 1,
          categoryId: 1,
          subtitle: 'Subtitle of Project 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          media: {
            mediaResponse: {
              id: 'media-id-1',
              type: 'image',
              url: 'http://example.com/image.jpg',
              preview_url: 'http://example.com/preview.jpg',
              remote_url: null,
              text_url: null,
              meta: null,
              description: 'Media description',
              blurhash: 'blurhash-string',
            },
            processing: 2,
          },
          isFavorite: true,
        },
      ];

      jest.spyOn(accountService, 'findOneDonor').mockResolvedValue(donor);
      jest
        .spyOn(projectService, 'getAllProjectsService')
        .mockResolvedValue(projects);

      const result = await controller.getAllProjects(req as any);

      expect(accountService.findOneDonor).toHaveBeenCalledWith(accountId);
      expect(projectService.getAllProjectsService).toHaveBeenCalledWith(
        donor.id,
      );
      expect(result).toEqual(projects);
    });

    it('should call getAllProjectsService with null if donor not found', async () => {
      const accountId = 1;
      const req = { user: { id: accountId } };
      const projects = [
        {
          id: 1,
          name: 'Project 1',
          description: 'Description of Project 1',
          mediaId: 'media-id-1',
          institutionId: 1,
          categoryId: 1,
          subtitle: 'Subtitle of Project 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          media: {
            mediaResponse: {
              id: 'media-id-1',
              type: 'image',
              url: 'http://example.com/image.jpg',
              preview_url: 'http://example.com/preview.jpg',
              remote_url: null,
              text_url: null,
              meta: null,
              description: 'Media description',
              blurhash: 'blurhash-string',
            },
            processing: 2,
          },
          isFavorite: true,
        },
      ];

      jest.spyOn(accountService, 'findOneDonor').mockResolvedValue(null);
      jest
        .spyOn(projectService, 'getAllProjectsService')
        .mockResolvedValue(projects);

      const result = await controller.getAllProjects(req as any);

      expect(accountService.findOneDonor).toHaveBeenCalledWith(accountId);
      expect(projectService.getAllProjectsService).toHaveBeenCalledWith(null);
      expect(result).toEqual(projects);
    });
  });

  describe('getFavoriteProjects', () => {
    it('should return favorite projects', async () => {
      const accountId = 1;
      const donor = { id: 2, accountId: accountId };
      const req = { user: { id: accountId } };
      const favoriteProjects = [
        {
          id: 1,
          name: 'Project 1',
          description: 'Description of Project 1',
          mediaId: 'media-id-1',
          institutionId: 1,
          subtitle: 'Subtitle of Project 1',
          categoryId: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          media: {
            mediaResponse: {
              id: 'media-id-1',
              type: 'image',
              url: 'http://example.com/image.jpg',
              preview_url: 'http://example.com/preview.jpg',
              remote_url: null,
              text_url: null,
              meta: null,
              description: 'Media description',
              blurhash: 'blurhash-string',
            },
            processing: 2,
          },
          isFavorite: true,
        },
      ];

      jest.spyOn(accountService, 'findOneDonor').mockResolvedValue(donor);
      jest
        .spyOn(projectService, 'getFavoriteProjectService')
        .mockResolvedValue(favoriteProjects);

      const result = await controller.getFavoriteProjects(req as any);

      expect(accountService.findOneDonor).toHaveBeenCalledWith(accountId);
      expect(projectService.getFavoriteProjectService).toHaveBeenCalledWith(
        donor.id,
      );
      expect(result).toEqual(favoriteProjects);
    });
  });

  describe('getProjectCategories', () => {
    it('should return project categories', async () => {
      const categories = [{ id: 1, name: 'Category 1' }];

      jest
        .spyOn(projectService, 'getProjectCategoriesService')
        .mockResolvedValue(categories);

      const result = await controller.getProjectCategories();

      expect(projectService.getProjectCategoriesService).toHaveBeenCalled();
      expect(result).toEqual(categories);
    });
  });

  describe('getProjectById', () => {
    it('should return project by id', async () => {
      const projectId = 1;
      const project = {
        id: 1,
        name: 'Project 1',
        description: 'Description of Project 1',
        mediaId: 'media-id-1',
        institutionId: 1,
        subtitle: 'Subtitle of Project 1',
        categoryId: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        media: {
          mediaResponse: {
            id: 'media-id-1',
            type: 'image',
            url: 'http://example.com/image.jpg',
            preview_url: 'http://example.com/preview.jpg',
            remote_url: null,
            text_url: null,
            meta: null,
            description: 'Media description',
            blurhash: 'blurhash-string',
          },
          processing: 2,
        },
        isFavorite: true,
      };

      jest
        .spyOn(projectService, 'getProjectByIdService')
        .mockResolvedValue(project);

      const result = await controller.getProjectById(projectId);

      expect(projectService.getProjectByIdService).toHaveBeenCalledWith(
        projectId,
      );
      expect(result).toEqual(project);
    });
  });

  describe('getProjectsByInstitution', () => {
    it('should return projects by institution id', async () => {
      const institutionId = 1;
      const projects = [
        {
          id: 1,
          name: 'Project 1',
          description: 'Description of Project 1',
          mediaId: 'media-id-1',
          institutionId: 1,
          subtitle: 'Subtitle of Project 1',
          categoryId: 3, // Added categoryId
          createdAt: new Date(),
          updatedAt: new Date(),
          media: {
            mediaResponse: {
              id: 'media-id-1',
              type: 'image',
              url: 'http://example.com/image.jpg',
              preview_url: 'http://example.com/preview.jpg',
              remote_url: null,
              text_url: null,
              meta: null,
              description: 'Media description',
              blurhash: 'blurhash-string',
            },
            processing: 2,
          },
          isFavorite: true,
        },
      ];

      jest
        .spyOn(projectService, 'getProjectsByInstitutionService')
        .mockResolvedValue(projects);

      const result = await controller.getProjectsByInstitution(institutionId);

      expect(
        projectService.getProjectsByInstitutionService,
      ).toHaveBeenCalledWith(institutionId);
      expect(result).toEqual(projects);
    });
  });
});
