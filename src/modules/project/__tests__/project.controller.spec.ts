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
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
      };

      const req = { user: { id: accountId } };

      const project = {
        id: 1,
        description: 'Test project description',
        name: 'Test Project',
        category: {
          id: 1,
          name: 'infancia',
        },
        subtitle: 'Test Subtitle',
        media: {
          id: 'media-id',
          statusId: BigInt(1), // Corrigido para bigint.
          fileFileName: 'DeWatermark.ai_1731156953652.png',
          fileContentType: 'image/png',
          fileFileSize: 789337,
          fileUpdatedAt: null,
          remoteUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-12-29T18:32:38.158Z'),
          updatedAt: new Date('2024-12-29T18:32:38.158Z'),
          shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
          type: 1,
          fileMeta: {
            focus: {
              x: 0,
              y: 0,
            },
            original: {
              size: '800x1200',
              width: 800,
              aspect: 0.6666666666666666,
              height: 1200,
            },
          },
          accountId: 8,
          description: 'Media description',
          scheduledStatusId: null,
          blurhash: 'blurhash-string',
          processing: 2,
          fileStorageSchemaVersion: 1,
          thumbnailFileName: null,
          thumbnailContentType: null,
          thumbnailFileSize: null,
          thumbnailUpdatedAt: null,
          thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
        },
        mediaId: 'media-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        institution: {
          id: 1,
          name: 'Institution Name',
          description: 'Institution Description',
          category: {
            name: 'Institution Category',
          },
          account: {
            id: 2,
            name: 'Account Name',
            avatarId: 'avatar-id',
            media: {
              id: 'media-id',
              statusId: BigInt(1),
              fileFileName: 'DeWatermark.ai_1731156953652.png',
              fileContentType: 'image/png',
              fileFileSize: 789337,
              fileUpdatedAt: null,
              remoteUrl: 'http://example.com/image.jpg',
              createdAt: new Date('2024-12-29T18:32:38.158Z'),
              updatedAt: new Date('2024-12-29T18:32:38.158Z'),
              shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
              type: 1,
              fileMeta: {
                focus: {
                  x: 0,
                  y: 0,
                },
                original: {
                  size: '800x1200',
                  width: 800,
                  aspect: 0.6666666666666666,
                  height: 1200,
                },
              },
              accountId: 8,
              description: 'Media description',
              scheduledStatusId: null,
              blurhash: 'blurhash-string',
              processing: 2,
              fileStorageSchemaVersion: 1,
              thumbnailFileName: null,
              thumbnailContentType: null,
              thumbnailFileSize: null,
              thumbnailUpdatedAt: null,
              thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
            },
          },
        },
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
        media: mockFile,
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
        account: {
          id: 2,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
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
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
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
        category: {
          id: 1,
          name: 'infancia',
        },
        media: {
          id: 'media-id',
          statusId: BigInt(1),
          fileFileName: 'DeWatermark.ai_1731156953652.png',
          fileContentType: 'image/png',
          fileFileSize: 789337,
          fileUpdatedAt: null,
          remoteUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-12-29T18:32:38.158Z'),
          updatedAt: new Date('2024-12-29T18:32:38.158Z'),
          shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
          type: 1,
          fileMeta: {
            focus: {
              x: 0,
              y: 0,
            },
            original: {
              size: '800x1200',
              width: 800,
              aspect: 0.6666666666666666,
              height: 1200,
            },
          },
          accountId: 8,
          description: 'Media description',
          scheduledStatusId: null,
          blurhash: 'blurhash-string',
          processing: 2,
          fileStorageSchemaVersion: 1,
          thumbnailFileName: null,
          thumbnailContentType: null,
          thumbnailFileSize: null,
          thumbnailUpdatedAt: null,
          thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
        },
        institution: {
          id: 1,
          name: 'Institution Name',
          description: 'Institution Description',
          category: {
            name: 'Institution Category',
          },
          account: {
            id: 2,
            name: 'Account Name',
            avatarId: 'avatar-id',
            media: {
              id: 'media-id',
              statusId: BigInt(1),
              fileFileName: 'DeWatermark.ai_1731156953652.png',
              fileContentType: 'image/png',
              fileFileSize: 789337,
              fileUpdatedAt: null,
              remoteUrl: 'http://example.com/image.jpg',
              createdAt: new Date('2024-12-29T18:32:38.158Z'),
              updatedAt: new Date('2024-12-29T18:32:38.158Z'),
              shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
              type: 1,
              fileMeta: {
                focus: {
                  x: 0,
                  y: 0,
                },
                original: {
                  size: '800x1200',
                  width: 800,
                  aspect: 0.6666666666666666,
                  height: 1200,
                },
              },
              accountId: 8,
              description: 'Media description',
              scheduledStatusId: null,
              blurhash: 'blurhash-string',
              processing: 2,
              fileStorageSchemaVersion: 1,
              thumbnailFileName: null,
              thumbnailContentType: null,
              thumbnailFileSize: null,
              thumbnailUpdatedAt: null,
              thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
            },
          },
        },
      };

      const updatedProjectData = {
        name: 'New Project Name',
        description: 'New Description',
        subtitle: 'New Subtitle',
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
          id: 'media-id',
          statusId: BigInt(1),
          fileFileName: 'DeWatermark.ai_1731156953652.png',
          fileContentType: 'image/png',
          fileFileSize: 789337,
          fileUpdatedAt: null,
          remoteUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-12-29T18:32:38.158Z'),
          updatedAt: new Date('2024-12-29T18:32:38.158Z'),
          shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
          type: 1,
          fileMeta: {
            focus: {
              x: 0,
              y: 0,
            },
            original: {
              size: '800x1200',
              width: 800,
              aspect: 0.6666666666666666,
              height: 1200,
            },
          },
          accountId: 8,
          description: 'Media description',
          scheduledStatusId: null,
          blurhash: 'blurhash-string',
          processing: 2,
          fileStorageSchemaVersion: 1,
          thumbnailFileName: null,
          thumbnailContentType: null,
          thumbnailFileSize: null,
          thumbnailUpdatedAt: null,
          thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
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
        account: {
          id: 2,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
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
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
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
        category: {
          id: 1,
          name: 'infancia',
        },
        media: {
          id: 'media-id',
          statusId: BigInt(1),
          fileFileName: 'DeWatermark.ai_1731156953652.png',
          fileContentType: 'image/png',
          fileFileSize: 789337,
          fileUpdatedAt: null,
          remoteUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-12-29T18:32:38.158Z'),
          updatedAt: new Date('2024-12-29T18:32:38.158Z'),
          shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
          type: 1,
          fileMeta: {
            focus: {
              x: 0,
              y: 0,
            },
            original: {
              size: '800x1200',
              width: 800,
              aspect: 0.6666666666666666,
              height: 1200,
            },
          },
          accountId: 8,
          description: 'Media description',
          scheduledStatusId: null,
          blurhash: 'blurhash-string',
          processing: 2,
          fileStorageSchemaVersion: 1,
          thumbnailFileName: null,
          thumbnailContentType: null,
          thumbnailFileSize: null,
          thumbnailUpdatedAt: null,
          thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
        },
        institution: {
          id: 2,
          name: 'Old project',
          description: 'Old Description',
          category: {
            name: 'Institution Category',
          },
          account: {
            id: 2,
            name: 'Account Name',
            avatarId: 'avatar-id',
            media: {
              id: 'media-id',
              statusId: BigInt(1),
              fileFileName: 'DeWatermark.ai_1731156953652.png',
              fileContentType: 'image/png',
              fileFileSize: 789337,
              fileUpdatedAt: null,
              remoteUrl: 'http://example.com/image.jpg',
              createdAt: new Date('2024-12-29T18:32:38.158Z'),
              updatedAt: new Date('2024-12-29T18:32:38.158Z'),
              shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
              type: 1,
              fileMeta: {
                focus: {
                  x: 0,
                  y: 0,
                },
                original: {
                  size: '800x1200',
                  width: 800,
                  aspect: 0.6666666666666666,
                  height: 1200,
                },
              },
              accountId: 8,
              description: 'Media description',
              scheduledStatusId: null,
              blurhash: 'blurhash-string',
              processing: 2,
              fileStorageSchemaVersion: 1,
              thumbnailFileName: null,
              thumbnailContentType: null,
              thumbnailFileSize: null,
              thumbnailUpdatedAt: null,
              thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
            },
          },
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
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
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
        category: {
          id: 1,
          name: 'infancia',
        },
        media: {
          id: 'media-id',
          statusId: BigInt(1),
          fileFileName: 'DeWatermark.ai_1731156953652.png',
          fileContentType: 'image/png',
          fileFileSize: 789337,
          fileUpdatedAt: null,
          remoteUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-12-29T18:32:38.158Z'),
          updatedAt: new Date('2024-12-29T18:32:38.158Z'),
          shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
          type: 1,
          fileMeta: {
            focus: {
              x: 0,
              y: 0,
            },
            original: {
              size: '800x1200',
              width: 800,
              aspect: 0.6666666666666666,
              height: 1200,
            },
          },
          accountId: 8,
          description: 'Media description',
          scheduledStatusId: null,
          blurhash: 'blurhash-string',
          processing: 2,
          fileStorageSchemaVersion: 1,
          thumbnailFileName: null,
          thumbnailContentType: null,
          thumbnailFileSize: null,
          thumbnailUpdatedAt: null,
          thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
        },
        institution: {
          id: 1,
          name: 'Institution Name',
          description: 'Institution Description',
          category: {
            name: 'Institution Category',
          },
          account: {
            id: 2,
            name: 'Account Name',
            avatarId: 'avatar-id',
            media: {
              id: 'media-id',
              statusId: BigInt(1),
              fileFileName: 'DeWatermark.ai_1731156953652.png',
              fileContentType: 'image/png',
              fileFileSize: 789337,
              fileUpdatedAt: null,
              remoteUrl: 'http://example.com/image.jpg',
              createdAt: new Date('2024-12-29T18:32:38.158Z'),
              updatedAt: new Date('2024-12-29T18:32:38.158Z'),
              shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
              type: 1,
              fileMeta: {
                focus: {
                  x: 0,
                  y: 0,
                },
                original: {
                  size: '800x1200',
                  width: 800,
                  aspect: 0.6666666666666666,
                  height: 1200,
                },
              },
              accountId: 8,
              description: 'Media description',
              scheduledStatusId: null,
              blurhash: 'blurhash-string',
              processing: 2,
              fileStorageSchemaVersion: 1,
              thumbnailFileName: null,
              thumbnailContentType: null,
              thumbnailFileSize: null,
              thumbnailUpdatedAt: null,
              thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
            },
          },
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
        account: {
          id: 2,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
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
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
          email: 'instituicao@gmail.com',
          followersCount: 1,
        },
        cnpj: '12345678901234',
        phone: '1234567890',
        category: {
          name: 'infancia',
        },
        isFollowing: false,
        fields: [],
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
        category: {
          id: 1,
          name: 'infancia',
        },
        media: {
          id: 'media-id',
          statusId: BigInt(1),
          fileFileName: 'DeWatermark.ai_1731156953652.png',
          fileContentType: 'image/png',
          fileFileSize: 789337,
          fileUpdatedAt: null,
          remoteUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-12-29T18:32:38.158Z'),
          updatedAt: new Date('2024-12-29T18:32:38.158Z'),
          shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
          type: 1,
          fileMeta: {
            focus: {
              x: 0,
              y: 0,
            },
            original: {
              size: '800x1200',
              width: 800,
              aspect: 0.6666666666666666,
              height: 1200,
            },
          },
          accountId: 8,
          description: 'Media description',
          scheduledStatusId: null,
          blurhash: 'blurhash-string',
          processing: 2,
          fileStorageSchemaVersion: 1,
          thumbnailFileName: null,
          thumbnailContentType: null,
          thumbnailFileSize: null,
          thumbnailUpdatedAt: null,
          thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
        },
        institution: {
          id: 2,
          name: 'Institution Name',
          description: 'Institution Description',
          category: {
            name: 'Institution Category',
          },
          account: {
            id: 2,
            name: 'Account Name',
            avatarId: 'avatar-id',
            media: {
              id: 'media-id',
              statusId: BigInt(1),
              fileFileName: 'DeWatermark.ai_1731156953652.png',
              fileContentType: 'image/png',
              fileFileSize: 789337,
              fileUpdatedAt: null,
              remoteUrl: 'http://example.com/image.jpg',
              createdAt: new Date('2024-12-29T18:32:38.158Z'),
              updatedAt: new Date('2024-12-29T18:32:38.158Z'),
              shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
              type: 1,
              fileMeta: {
                focus: {
                  x: 0,
                  y: 0,
                },
                original: {
                  size: '800x1200',
                  width: 800,
                  aspect: 0.6666666666666666,
                  height: 1200,
                },
              },
              accountId: 8,
              description: 'Media description',
              scheduledStatusId: null,
              blurhash: 'blurhash-string',
              processing: 2,
              fileStorageSchemaVersion: 1,
              thumbnailFileName: null,
              thumbnailContentType: null,
              thumbnailFileSize: null,
              thumbnailUpdatedAt: null,
              thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
            },
          },
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

      const donor = {
        id: 2,
        account: {
          id: accountId,
          name: 'Gabriel',
          email: 'instituto@gmail.com',
          media: null,
          avatarId: null,
          note: null,
        },
        donations: [],
      };

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
      const donor = {
        id: 2,
        account: {
          id: accountId,
          name: 'Gabriel',
          email: 'instituto@gmail.com',
          media: null,
          avatarId: null,
          note: null,
        },
        donations: [],
      };

      const projects = [
        {
          id: 1,
          name: 'Old Project Name',
          description: 'Old Description',
          subtitle: 'Old Subtitle',
          categoryId: 1,
          institutionId: 1,
          mediaId: 'old-media-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 1,
            name: 'infancia',
          },
          isFavorite: false,
          media: {
            id: 'media-id',
            statusId: BigInt(1),
            fileFileName: 'DeWatermark.ai_1731156953652.png',
            fileContentType: 'image/png',
            fileFileSize: 789337,
            fileUpdatedAt: null,
            remoteUrl: 'http://example.com/image.jpg',
            createdAt: new Date('2024-12-29T18:32:38.158Z'),
            updatedAt: new Date('2024-12-29T18:32:38.158Z'),
            shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
            type: 1,
            fileMeta: {
              focus: {
                x: 0,
                y: 0,
              },
              original: {
                size: '800x1200',
                width: 800,
                aspect: 0.6666666666666666,
                height: 1200,
              },
            },
            accountId: 8,
            description: 'Media description',
            scheduledStatusId: null,
            blurhash: 'blurhash-string',
            processing: 2,
            fileStorageSchemaVersion: 1,
            thumbnailFileName: null,
            thumbnailContentType: null,
            thumbnailFileSize: null,
            thumbnailUpdatedAt: null,
            thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
          },
          institution: {
            id: 1,
            name: 'Institution Name',
            description: 'Institution Description',
            category: {
              name: 'Institution Category',
            },
            account: {
              id: 2,
              name: 'Account Name',
              avatarId: 'avatar-id',
              media: {
                id: 'media-id',
                statusId: BigInt(1),
                fileFileName: 'DeWatermark.ai_1731156953652.png',
                fileContentType: 'image/png',
                fileFileSize: 789337,
                fileUpdatedAt: null,
                remoteUrl: 'http://example.com/image.jpg',
                createdAt: new Date('2024-12-29T18:32:38.158Z'),
                updatedAt: new Date('2024-12-29T18:32:38.158Z'),
                shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
                type: 1,
                fileMeta: {
                  focus: {
                    x: 0,
                    y: 0,
                  },
                  original: {
                    size: '800x1200',
                    width: 800,
                    aspect: 0.6666666666666666,
                    height: 1200,
                  },
                },
                accountId: 8,
                description: 'Media description',
                scheduledStatusId: null,
                blurhash: 'blurhash-string',
                processing: 2,
                fileStorageSchemaVersion: 1,
                thumbnailFileName: null,
                thumbnailContentType: null,
                thumbnailFileSize: null,
                thumbnailUpdatedAt: null,
                thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
              },
            },
          },
        },
      ];

      const req = { user: { id: 1 } };
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
          name: 'Old Project Name',
          description: 'Old Description',
          subtitle: 'Old Subtitle',
          categoryId: 1,
          institutionId: 1,
          mediaId: 'old-media-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 1,
            name: 'infancia',
          },
          isFavorite: false,
          media: {
            id: 'media-id',
            statusId: BigInt(1),
            fileFileName: 'DeWatermark.ai_1731156953652.png',
            fileContentType: 'image/png',
            fileFileSize: 789337,
            fileUpdatedAt: null,
            remoteUrl: 'http://example.com/image.jpg',
            createdAt: new Date('2024-12-29T18:32:38.158Z'),
            updatedAt: new Date('2024-12-29T18:32:38.158Z'),
            shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
            type: 1,
            fileMeta: {
              focus: {
                x: 0,
                y: 0,
              },
              original: {
                size: '800x1200',
                width: 800,
                aspect: 0.6666666666666666,
                height: 1200,
              },
            },
            accountId: 8,
            description: 'Media description',
            scheduledStatusId: null,
            blurhash: 'blurhash-string',
            processing: 2,
            fileStorageSchemaVersion: 1,
            thumbnailFileName: null,
            thumbnailContentType: null,
            thumbnailFileSize: null,
            thumbnailUpdatedAt: null,
            thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
          },
          institution: {
            id: 1,
            name: 'Institution Name',
            description: 'Institution Description',
            category: {
              name: 'Institution Category',
            },
            account: {
              id: 2,
              name: 'Account Name',
              avatarId: 'avatar-id',
              media: {
                id: 'media-id',
                statusId: BigInt(1),
                fileFileName: 'DeWatermark.ai_1731156953652.png',
                fileContentType: 'image/png',
                fileFileSize: 789337,
                fileUpdatedAt: null,
                remoteUrl: 'http://example.com/image.jpg',
                createdAt: new Date('2024-12-29T18:32:38.158Z'),
                updatedAt: new Date('2024-12-29T18:32:38.158Z'),
                shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
                type: 1,
                fileMeta: {
                  focus: {
                    x: 0,
                    y: 0,
                  },
                  original: {
                    size: '800x1200',
                    width: 800,
                    aspect: 0.6666666666666666,
                    height: 1200,
                  },
                },
                accountId: 8,
                description: 'Media description',
                scheduledStatusId: null,
                blurhash: 'blurhash-string',
                processing: 2,
                fileStorageSchemaVersion: 1,
                thumbnailFileName: null,
                thumbnailContentType: null,
                thumbnailFileSize: null,
                thumbnailUpdatedAt: null,
                thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
              },
            },
          },
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
      const donor = {
        id: 2,
        account: {
          id: accountId,
          name: 'Gabriel',
          email: 'instituto@gmail.com',
          media: null,
          avatarId: null,
          note: null,
        },
        donations: [],
      };
      const req = { user: { id: accountId } };

      const favoriteProjects = [
        {
          id: 1,
          name: 'Old Project Name',
          description: 'Old Description',
          subtitle: 'Old Subtitle',
          categoryId: 1,
          institutionId: 1,
          mediaId: 'old-media-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 1,
            name: 'infancia',
          },
          isFavorite: true,
          media: {
            id: 'media-id',
            statusId: BigInt(1),
            fileFileName: 'DeWatermark.ai_1731156953652.png',
            fileContentType: 'image/png',
            fileFileSize: 789337,
            fileUpdatedAt: null,
            remoteUrl: 'http://example.com/image.jpg',
            createdAt: new Date('2024-12-29T18:32:38.158Z'),
            updatedAt: new Date('2024-12-29T18:32:38.158Z'),
            shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
            type: 1,
            fileMeta: {
              focus: {
                x: 0,
                y: 0,
              },
              original: {
                size: '800x1200',
                width: 800,
                aspect: 0.6666666666666666,
                height: 1200,
              },
            },
            accountId: 8,
            description: 'Media description',
            scheduledStatusId: null,
            blurhash: 'blurhash-string',
            processing: 2,
            fileStorageSchemaVersion: 1,
            thumbnailFileName: null,
            thumbnailContentType: null,
            thumbnailFileSize: null,
            thumbnailUpdatedAt: null,
            thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
          },
          institution: {
            id: 1,
            name: 'Institution Name',
            description: 'Institution Description',
            category: {
              name: 'Institution Category',
            },
            account: {
              id: 2,
              name: 'Account Name',
              avatarId: 'avatar-id',
              media: {
                id: 'media-id',
                statusId: BigInt(1),
                fileFileName: 'DeWatermark.ai_1731156953652.png',
                fileContentType: 'image/png',
                fileFileSize: 789337,
                fileUpdatedAt: null,
                remoteUrl: 'http://example.com/image.jpg',
                createdAt: new Date('2024-12-29T18:32:38.158Z'),
                updatedAt: new Date('2024-12-29T18:32:38.158Z'),
                shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
                type: 1,
                fileMeta: {
                  focus: {
                    x: 0,
                    y: 0,
                  },
                  original: {
                    size: '800x1200',
                    width: 800,
                    aspect: 0.6666666666666666,
                    height: 1200,
                  },
                },
                accountId: 8,
                description: 'Media description',
                scheduledStatusId: null,
                blurhash: 'blurhash-string',
                processing: 2,
                fileStorageSchemaVersion: 1,
                thumbnailFileName: null,
                thumbnailContentType: null,
                thumbnailFileSize: null,
                thumbnailUpdatedAt: null,
                thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
              },
            },
          },
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
        id: projectId,
        name: 'Old Project Name',
        description: 'Old Description',
        subtitle: 'Old Subtitle',
        categoryId: 1,
        institutionId: 1,
        mediaId: 'old-media-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 1,
          name: 'infancia',
        },
        media: {
          id: 'media-id',
          statusId: BigInt(1),
          fileFileName: 'DeWatermark.ai_1731156953652.png',
          fileContentType: 'image/png',
          fileFileSize: 789337,
          fileUpdatedAt: null,
          remoteUrl: 'http://example.com/image.jpg',
          createdAt: new Date('2024-12-29T18:32:38.158Z'),
          updatedAt: new Date('2024-12-29T18:32:38.158Z'),
          shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
          type: 1,
          fileMeta: {
            focus: {
              x: 0,
              y: 0,
            },
            original: {
              size: '800x1200',
              width: 800,
              aspect: 0.6666666666666666,
              height: 1200,
            },
          },
          accountId: 8,
          description: 'Media description',
          scheduledStatusId: null,
          blurhash: 'blurhash-string',
          processing: 2,
          fileStorageSchemaVersion: 1,
          thumbnailFileName: null,
          thumbnailContentType: null,
          thumbnailFileSize: null,
          thumbnailUpdatedAt: null,
          thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
        },
        institution: {
          id: 1,
          name: 'Institution Name',
          description: 'Institution Description',
          category: {
            name: 'Institution Category',
          },
          account: {
            id: 2,
            name: 'Account Name',
            avatarId: 'avatar-id',
            media: {
              id: 'media-id',
              statusId: BigInt(1),
              fileFileName: 'DeWatermark.ai_1731156953652.png',
              fileContentType: 'image/png',
              fileFileSize: 789337,
              fileUpdatedAt: null,
              remoteUrl: 'http://example.com/image.jpg',
              createdAt: new Date('2024-12-29T18:32:38.158Z'),
              updatedAt: new Date('2024-12-29T18:32:38.158Z'),
              shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
              type: 1,
              fileMeta: {
                focus: {
                  x: 0,
                  y: 0,
                },
                original: {
                  size: '800x1200',
                  width: 800,
                  aspect: 0.6666666666666666,
                  height: 1200,
                },
              },
              accountId: 8,
              description: 'Media description',
              scheduledStatusId: null,
              blurhash: 'blurhash-string',
              processing: 2,
              fileStorageSchemaVersion: 1,
              thumbnailFileName: null,
              thumbnailContentType: null,
              thumbnailFileSize: null,
              thumbnailUpdatedAt: null,
              thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
            },
          },
        },
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
          name: 'Old Project Name',
          description: 'Old Description',
          subtitle: 'Old Subtitle',
          categoryId: 1,
          institutionId: 1,
          mediaId: 'old-media-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 1,
            name: 'infancia',
          },
          isFavorite: true,
          media: {
            id: 'media-id',
            statusId: BigInt(1),
            fileFileName: 'DeWatermark.ai_1731156953652.png',
            fileContentType: 'image/png',
            fileFileSize: 789337,
            fileUpdatedAt: null,
            remoteUrl: 'http://example.com/image.jpg',
            createdAt: new Date('2024-12-29T18:32:38.158Z'),
            updatedAt: new Date('2024-12-29T18:32:38.158Z'),
            shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
            type: 1,
            fileMeta: {
              focus: {
                x: 0,
                y: 0,
              },
              original: {
                size: '800x1200',
                width: 800,
                aspect: 0.6666666666666666,
                height: 1200,
              },
            },
            accountId: 8,
            description: 'Media description',
            scheduledStatusId: null,
            blurhash: 'blurhash-string',
            processing: 2,
            fileStorageSchemaVersion: 1,
            thumbnailFileName: null,
            thumbnailContentType: null,
            thumbnailFileSize: null,
            thumbnailUpdatedAt: null,
            thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
          },
          institution: {
            id: 1,
            name: 'Institution Name',
            description: 'Institution Description',
            category: {
              name: 'Institution Category',
            },
            account: {
              id: 2,
              name: 'Account Name',
              avatarId: 'avatar-id',
              media: {
                id: 'media-id',
                statusId: BigInt(1),
                fileFileName: 'DeWatermark.ai_1731156953652.png',
                fileContentType: 'image/png',
                fileFileSize: 789337,
                fileUpdatedAt: null,
                remoteUrl: 'http://example.com/image.jpg',
                createdAt: new Date('2024-12-29T18:32:38.158Z'),
                updatedAt: new Date('2024-12-29T18:32:38.158Z'),
                shortcode: 'cfa91091-54af-4027-bca5-a89067c92105',
                type: 1,
                fileMeta: {
                  focus: {
                    x: 0,
                    y: 0,
                  },
                  original: {
                    size: '800x1200',
                    width: 800,
                    aspect: 0.6666666666666666,
                    height: 1200,
                  },
                },
                accountId: 8,
                description: 'Media description',
                scheduledStatusId: null,
                blurhash: 'blurhash-string',
                processing: 2,
                fileStorageSchemaVersion: 1,
                thumbnailFileName: null,
                thumbnailContentType: null,
                thumbnailFileSize: null,
                thumbnailUpdatedAt: null,
                thumbnailRemoteUrl: 'http://example.com/thumbnail.jpg',
              },
            },
          },
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
