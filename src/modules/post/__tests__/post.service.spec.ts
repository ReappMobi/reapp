import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from '../post.service';
import { PrismaService } from '../../../database/prisma.service';
import { MediaService } from '../../media-attachment/media-attachment.service';
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
          },
        },
        {
          provide: MediaService,
          useValue: {
            processMedia: jest.fn(),
            getMediaAttachmentById: jest.fn(),
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
    it('should throw an error if file is missing', async () => {
      const caption = 'Test caption';
      const institutionId = 1;
      const accountId = 1;

      await expect(
        service.postPublication(caption, null, institutionId, accountId),
      ).rejects.toThrow(HttpException);
      await expect(
        service.postPublication(caption, null, institutionId, accountId),
      ).rejects.toThrow('File is required');
    });

    it('should throw an error if caption is missing', async () => {
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
      ).rejects.toThrow('Caption is required');
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
          body: caption,
          institutionId,
          mediaId: 'mock-media-id',
        },
      });
      expect(result).toEqual({
        ...createdPost,
        media,
      });
    });
  });

  describe('getAllPosts', () => {
    it('should return all posts with media', async () => {
      const mockPosts = [
        { id: 1, body: 'Post 1', mediaId: 'media-1' },
        { id: 2, body: 'Post 2', mediaId: 'media-2' },
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

      const result = await service.getAllPosts();

      expect(prismaService.post.findMany).toHaveBeenCalled();
      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'media-1',
      );
      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'media-2',
      );
      expect(result).toEqual([
        { ...mockPosts[0], media: media1 },
        { ...mockPosts[1], media: media2 },
      ]);
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
      });
      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'media-1',
      );
      expect(mediaService.getMediaAttachmentById).toHaveBeenCalledWith(
        'media-2',
      );
      expect(result).toEqual([
        { ...mockPosts[0], media: media1 },
        { ...mockPosts[1], media: media2 },
      ]);
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
      const post = { id: 1, institutionId: 1 };

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
      const post = { id: postId, institutionId: 1 };
      const mediaResponse = {
        mediaAttachment: { id: 'new-media-id' },
      };
      const updatedPost = {
        id: postId,
        body: newCaption,
        mediaId: 'new-media-id',
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
      });
      expect(result).toEqual({
        ...updatedPost,
        media,
      });
    });
  });
});
