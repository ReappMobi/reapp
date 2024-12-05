import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from '../post.controller';
import { PostService } from '../post.service';
import { AuthGuard } from '../../auth/auth.guard';
import { UnauthorizedException } from '@nestjs/common';

describe('PostController', () => {
  let controller: PostController;
  let postService: PostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        {
          provide: PostService,
          useValue: {
            findInstitutionByAccountId: jest.fn(),
            postPublication: jest.fn(),
            getAllPosts: jest.fn(),
            getPostsByInstitution: jest.fn(),
            deletePost: jest.fn(),
            updatePost: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<PostController>(PostController);
    postService = module.get<PostService>(PostService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('postPublication', () => {
    it('should create a post and return 200 status', async () => {
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

      const accountId = 1;
      const caption = 'Test caption';
      const institution = { id: 1 };
      const userId = 1;
      const req = { user: { id: userId } };

      postService.findInstitutionByAccountId = jest
        .fn()
        .mockResolvedValue(institution);
      postService.postPublication = jest
        .fn()
        .mockResolvedValue({ id: 1, body: caption });

      const result = await controller.postPublication(
        mockFile,
        caption,
        req as any,
      );

      expect(postService.findInstitutionByAccountId).toHaveBeenCalledWith(
        accountId,
      );
      expect(postService.postPublication).toHaveBeenCalledWith(
        caption,
        mockFile,
        institution.id,
        accountId,
      );

      expect(result).toEqual({ id: 1, body: caption });
    });

    it('should throw UnauthorizedException if user is not authorized', async () => {
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

      const caption = 'Test caption';
      const req = { user: { id: 2 } }; // Different userId

      postService.findInstitutionByAccountId = jest
        .fn()
        .mockResolvedValue(null);

      await expect(
        controller.postPublication(mockFile, caption, req as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getAllPosts', () => {
    it('should return all posts with status 200', async () => {
      const mockPosts = [
        { id: 1, body: 'Post 1' },
        { id: 2, body: 'Post 2' },
      ];
      postService.getAllPosts = jest.fn().mockResolvedValue(mockPosts);

      const result = await controller.getAllPosts();

      expect(postService.getAllPosts).toHaveBeenCalled();
      expect(result).toEqual(mockPosts);
    });
  });

  describe('getPostsByInstitution', () => {
    it('should return posts for a specific institution with status 200', async () => {
      const institutionId = 1;

      const mockPosts = [
        { id: 1, body: 'Post 1', institutionId },
        { id: 2, body: 'Post 2', institutionId },
      ];
      postService.getPostsByInstitution = jest
        .fn()
        .mockResolvedValue(mockPosts);

      const result = await controller.getPostsByInstitution(institutionId);

      expect(postService.getPostsByInstitution).toHaveBeenCalledWith(
        institutionId,
      );

      expect(result).toEqual(mockPosts);
    });
  });

  describe('deletePost', () => {
    it('should delete a post and return 204 status', async () => {
      const postId = 1;
      const req = { user: { id: 1 } };

      postService.deletePost = jest.fn().mockResolvedValue(undefined);

      const result = await controller.deletePost(postId, req as any);

      expect(postService.deletePost).toHaveBeenCalledWith(postId, 1);
      expect(result).toEqual({ message: 'Post deleted successfully' });
    });
  });

  describe('updatePost', () => {
    it('should update a post and return the updated post', async () => {
      const postId = 1;
      const caption = 'Updated caption';
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

      const req = { user: { id: 1 } };

      const updatedPost = {
        id: postId,
        body: caption,
        media: { id: 'media-id', url: 'http://example.com/image.jpg' },
      };
      postService.updatePost = jest.fn().mockResolvedValue(updatedPost);

      const result = await controller.updatePost(
        postId,
        caption,
        mockFile,
        req as any,
      );

      expect(postService.updatePost).toHaveBeenCalledWith(
        postId,
        caption,
        mockFile,
        1,
      );

      expect(result).toEqual(updatedPost);
    });
  });
});
