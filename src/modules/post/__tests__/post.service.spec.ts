import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from '../post.service';
import { PrismaService } from '../../../database/prisma.service';
import { MediaService } from '../../media-attachment/media-attachment.service';
import { AccountService } from '../../account/account.service';
import { HttpException, UnauthorizedException } from '@nestjs/common';

jest.mock('../../media-attachment/media-attachment.service');

describe('PostService', () => {
  let service: PostService;
  let prismaService: PrismaService;
  let mediaService: MediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        {
          provide: PrismaService,
          useValue: {
            post: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            institution: {
              findUnique: jest.fn(),
            },
            comment: {
              create: jest.fn(),
            },
            like: {
              findFirst: jest.fn(),
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
          },
        },
        {
          provide: AccountService,
          useValue: {
            findOneDonor: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
    prismaService = module.get<PrismaService>(PrismaService);
    mediaService = module.get<MediaService>(MediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('postPublication', () => {
    it('should throw an error if content is missing', async () => {
      const mockFile: Express.Multer.File = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        fieldname: '',
        encoding: '',
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const institutionId = 1;
      const accountId = 1;

      await expect(
        service.postPublication(null, mockFile, institutionId, accountId),
      ).rejects.toThrow(HttpException);
      await expect(
        service.postPublication(null, mockFile, institutionId, accountId),
      ).rejects.toThrow('O conteúdo da publicação não pode estar vazio');
    });

    it('should create a post with media when valid data is provided', async () => {
      const mockFile: Express.Multer.File = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        fieldname: '',
        encoding: '',
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const caption = 'Test caption';
      const institutionId = 1;
      const accountId = 1;
      const mediaResponse = {
        mediaAttachment: { id: 'mock-media-id' },
      };
      const media = {
        id: 'mock-media-id',
        url: 'http://example.com/media.jpg',
      };
      const createdPost = {
        id: 1,
        body: caption,
        institutionId,
        mediaId: 'mock-media-id',
      };

      mediaService.processMedia = jest.fn().mockResolvedValue(mediaResponse);
      mediaService.getMediaAttachmentById = jest.fn().mockResolvedValue(media);
      prismaService.post.create = jest.fn().mockResolvedValue(createdPost);

      const result = await service.postPublication(
        caption,
        mockFile,
        institutionId,
        accountId,
      );

      expect(mediaService.processMedia).toHaveBeenCalledWith(mockFile, {
        accountId,
      });

      expect(prismaService.post.create).toHaveBeenCalledWith({
        data: {
          body: 'Test caption',
          institution: {
            connect: {
              id: institutionId,
            },
          },
          media: mediaResponse.mediaAttachment.id
            ? { connect: { id: mediaResponse.mediaAttachment.id } }
            : undefined,
        },
        select: {
          body: true,
          comments: true,
          createdAt: true,
          id: true,
          institution: {
            select: {
              account: {
                select: {
                  id: true,
                  name: true,
                  avatarId: true,
                  media: true,
                },
              },
              category: {
                select: {
                  name: true,
                },
              },
              id: true,
            },
          },
          likes: {
            select: {
              id: true,
              accountId: true,
            },
          },
          saves: {
            select: {
              id: true,
              accountId: true,
            },
          },
          media: true,
          mediaId: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(createdPost);
    });
  });

  describe('getAllPosts', () => {
    it('should return all posts with media and avatars', async () => {
      const mockPosts = [
        {
          id: 1,
          body: 'Post 1',
          mediaId: 'media-1',
          institution: {
            account: { avatarId: 'avatar-1' },
          },
        },
        {
          id: 2,
          body: 'Post 2',
          mediaId: 'media-2',
          institution: {
            account: { avatarId: 'avatar-2' },
          },
        },
      ];

      prismaService.post.findMany = jest.fn().mockResolvedValue(mockPosts);

      const result = await service.getAllPosts();

      expect(prismaService.post.findMany).toHaveBeenCalled();

      expect(result).toEqual([mockPosts[0], mockPosts[1]]);
    });
  });

  describe('getPostsByInstitution', () => {
    it('should return posts for a specific institution with media', async () => {
      const institutionId = 1;
      const mockPosts = [
        { id: 1, body: 'Post 1', mediaId: 'media-1', institutionId },
        { id: 2, body: 'Post 2', mediaId: 'media-2', institutionId },
      ];
      const media1 = { id: 'media-1', url: 'http://example.com/media1.jpg' };
      const media2 = { id: 'media-2', url: 'http://example.com/media2.jpg' };

      prismaService.post.findMany = jest.fn().mockResolvedValue(mockPosts);
      mediaService.getMediaAttachmentById = jest
        .fn()
        .mockImplementation((mediaId) => {
          if (mediaId === 'media-1') return Promise.resolve(media1);
          if (mediaId === 'media-2') return Promise.resolve(media2);
          return Promise.resolve(null);
        });

      const result = await service.getPostsByInstitution(institutionId);

      expect(prismaService.post.findMany).toHaveBeenCalledWith({
        where: { institutionId },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          body: true,
          comments: true,
          createdAt: true,
          id: true,
          institution: {
            select: {
              account: {
                select: {
                  id: true,
                  name: true,
                  avatarId: true,
                  media: true,
                },
              },
              category: {
                select: {
                  name: true,
                },
              },
              id: true,
            },
          },
          likes: {
            select: {
              id: true,
              accountId: true,
            },
          },
          saves: {
            select: {
              id: true,
              accountId: true,
            },
          },
          media: true,
          mediaId: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockPosts);
    });
  });

  describe('deletePost', () => {
    it('should throw an error if user is not authorized to delete the post', async () => {
      const postId = 1;
      const userId = 2;

      prismaService.institution.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.deletePost(postId, userId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should delete the post if the user is authorized', async () => {
      const postId = 1;
      const userId = 1;
      const institution = { id: 1 };

      const post = {
        id: postId,
        body: 'some body',
        institution: { id: 1, category: { name: 'Educação' }, account: {} },
        mediaId: 'some-media-id',
        media: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
        likes: [],
      };

      prismaService.institution.findUnique = jest
        .fn()
        .mockResolvedValue(institution);
      prismaService.post.findUnique = jest.fn().mockResolvedValue(post);
      prismaService.post.delete = jest.fn().mockResolvedValue(undefined);

      await service.deletePost(postId, userId);

      expect(prismaService.post.delete).toHaveBeenCalledWith({
        where: { id: postId },
      });
    });
  });

  describe('updatePost', () => {
    it('should update a post with a new caption and media', async () => {
      const postId = 1;
      const newCaption = 'Updated caption';
      const mockFile: Express.Multer.File = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        fieldname: '',
        encoding: '',
        size: 1024,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      };

      const userId = 1;
      const institution = { id: 1 };
      const post = {
        id: postId,
        body: 'some body',
        institution: { id: 1, category: { name: 'Educação' }, account: {} },
        mediaId: 'some-media-id',
        media: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
        likes: [],
      };
      const mediaResponse = {
        mediaAttachment: { id: 'new-media-id' },
      };
      const updatedPost = {
        id: postId,
        body: newCaption,
        institution: { id: 1, category: { name: 'Educação' }, account: {} },
        mediaId: 'some-media-id',
        media: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
        likes: [],
      };
      const media = { id: 'new-media-id', url: 'http://example.com/media.jpg' };

      prismaService.institution.findUnique = jest
        .fn()
        .mockResolvedValue(institution);
      prismaService.post.findUnique = jest.fn().mockResolvedValue(post);
      mediaService.processMedia = jest.fn().mockResolvedValue(mediaResponse);
      mediaService.getMediaAttachmentById = jest.fn().mockResolvedValue(media);
      prismaService.post.update = jest.fn().mockResolvedValue(updatedPost);

      const result = await service.updatePost(
        postId,
        newCaption,
        mockFile,
        userId,
      );

      expect(prismaService.post.update).toHaveBeenCalledWith({
        where: { id: postId },
        data: {
          body: newCaption,
          mediaId: 'new-media-id',
        },
        select: {
          body: true,
          comments: true,
          createdAt: true,
          id: true,
          institution: {
            select: {
              account: {
                select: {
                  id: true,
                  name: true,
                  avatarId: true,
                  media: true,
                },
              },
              category: {
                select: {
                  name: true,
                },
              },
              id: true,
            },
          },
          likes: {
            select: {
              id: true,
              accountId: true,
            },
          },
          saves: {
            select: {
              id: true,
              accountId: true,
            },
          },
          media: true,
          mediaId: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual({
        ...updatedPost,
        media,
      });
    });
  });

  describe('addComment', () => {
    const postId = 1;
    const accountId = 2;
    const body = 'Meu comentário';
    const donor = { id: 10 };
    const post = {
      id: postId,
      body: 'some body',
      institution: {
        id: 1,
        category: { name: 'Educação' },
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
        },
      },
      mediaId: 'some-media-id',
      media: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      comments: [],
      likes: [],
      saves: [],
    };

    it('should add a comment successfully', async () => {
      (service as any).accountService.findOneDonor.mockResolvedValue(donor);
      jest.spyOn(service, 'findPostById').mockResolvedValue(post);
      (prismaService.comment.create as jest.Mock).mockResolvedValue({
        id: 100,
        body,
        postId,
        accountId,
      });

      const result = await service.addComment(postId, accountId, body);

      expect(service.findPostById).toHaveBeenCalledWith(postId);
      expect(prismaService.comment.create).toHaveBeenCalledWith({
        data: {
          body,
          postId: post.id,
          accountId: accountId,
        },
      });
      expect(result).toEqual({
        id: 100,
        body,
        postId,
        accountId: accountId,
      });
    });

    it('should throw BAD_REQUEST if body is empty', async () => {
      await expect(service.addComment(postId, accountId, '')).rejects.toThrow(
        'Por favor, insira o texto do comentário.',
      );
    });

    it('should throw NOT_FOUND if donor not found', async () => {
      (service as any).accountService.findOneDonor.mockResolvedValue(null);

      await expect(service.addComment(postId, accountId, body)).rejects.toThrow(
        'Não foi possível encontrar o post associado a este ID.',
      );
    });

    it('should throw NOT_FOUND if post not found', async () => {
      (service as any).accountService.findOneDonor.mockResolvedValue(donor);
      jest.spyOn(service, 'findPostById').mockResolvedValue(null);

      await expect(service.addComment(postId, accountId, body)).rejects.toThrow(
        'Não foi possível encontrar o post associado a este ID.',
      );
    });
  });

  describe('likePost', () => {
    const postId = 1;
    const accountId = 3;
    const donor = { id: 20 };
    const post = {
      id: postId,
      body: 'some body',
      institution: {
        id: 1,
        category: { name: 'Educação' },
        account: {
          id: accountId,
          name: 'instituicao',
          avatarId: null,
          media: null,
        },
      },
      mediaId: 'some-media-id',
      media: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      comments: [],
      likes: [],
      saves: [],
    };
    const like = { id: 200, postId, donorId: donor.id };

    it('should like the post successfully', async () => {
      (service as any).accountService.findOneDonor.mockResolvedValue(donor);
      jest.spyOn(service, 'findPostById').mockResolvedValue(post);
      (prismaService.like.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.like.create as jest.Mock).mockResolvedValue(like);

      const result = await service.likePost(postId, accountId);

      expect(service.findPostById).toHaveBeenCalledWith(postId);
      expect(prismaService.like.findFirst).toHaveBeenCalledWith({
        where: { postId, accountId },
      });
      expect(prismaService.like.create).toHaveBeenCalledWith({
        data: { postId, accountId },
      });
      expect(result).toEqual(like);
    });

    it('should throw NOT_FOUND if post not found', async () => {
      (service as any).accountService.findOneDonor.mockResolvedValue(donor);
      jest.spyOn(service, 'findPostById').mockResolvedValue(null);

      await expect(service.likePost(postId, accountId)).rejects.toThrow(
        'Post não encontrado',
      );
    });

    it('should throw BAD_REQUEST if post already liked by user', async () => {
      (service as any).accountService.findOneDonor.mockResolvedValue(donor);
      jest.spyOn(service, 'findPostById').mockResolvedValue(post);
      (prismaService.like.findFirst as jest.Mock).mockResolvedValue({
        id: 300,
      });

      await expect(service.likePost(postId, accountId)).rejects.toThrow(
        'Post já curtido pelo usuário',
      );
    });
  });

  describe('unlikePost', () => {
    const postId = 1;
    const accountId = 4;
    const donor = { id: 30 };

    it('should unlike the post successfully', async () => {
      (service as any).accountService.findOneDonor.mockResolvedValue(donor);
      (prismaService.like.findFirst as jest.Mock).mockResolvedValue({
        id: 400,
        postId,
        donorId: donor.id,
      });

      await service.unlikePost(postId, accountId);

      expect(prismaService.like.findFirst).toHaveBeenCalledWith({
        where: { postId, accountId },
      });
      expect(prismaService.like.delete).toHaveBeenCalledWith({
        where: { id: 400 },
      });
    });

    it('should throw BAD_REQUEST if user never liked the post', async () => {
      (service as any).accountService.findOneDonor.mockResolvedValue(donor);
      (prismaService.like.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.unlikePost(postId, accountId)).rejects.toThrow(
        'Esse usuário não curtiu este post',
      );
    });
  });
});
