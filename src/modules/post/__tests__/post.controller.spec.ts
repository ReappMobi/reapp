import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from '../post.controller';
import { PostService } from '../post.service';
import { AuthGuard } from '../../authentication/authentication.guard';
import { HttpStatus, UnauthorizedException } from '@nestjs/common';

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
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      postService.findInstitutionByAccountId = jest
        .fn()
        .mockResolvedValue(institution);
      postService.postPublication = jest
        .fn()
        .mockResolvedValue({ id: 1, body: caption });

      await controller.postPublication(
        mockFile,
        caption,
        accountId,
        req as any,
        res as any,
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
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({ id: 1, body: caption });
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

      const accountId = 1;
      const caption = 'Test caption';
      const req = { user: { id: 2 } }; // Different userId
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      postService.findInstitutionByAccountId = jest
        .fn()
        .mockResolvedValue(null);

      await expect(
        controller.postPublication(
          mockFile,
          caption,
          accountId,
          req as any,
          res as any,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getAllPosts', () => {
    it('should return all posts with status 200', async () => {
      const req = { user: { id: 1 } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockPosts = [
        { id: 1, body: 'Post 1' },
        { id: 2, body: 'Post 2' },
      ];
      postService.getAllPosts = jest.fn().mockResolvedValue(mockPosts);

      await controller.getAllPosts(req as any, res as any);

      expect(postService.getAllPosts).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockPosts);
    });
  });

  describe('getPostsByInstitution', () => {
    it('should return posts for a specific institution with status 200', async () => {
      const institutionId = 1;
      const req = { user: { id: 1 } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockPosts = [
        { id: 1, body: 'Post 1', institutionId },
        { id: 2, body: 'Post 2', institutionId },
      ];
      postService.getPostsByInstitution = jest
        .fn()
        .mockResolvedValue(mockPosts);

      await controller.getPostsByInstitution(
        institutionId,
        req as any,
        res as any,
      );

      expect(postService.getPostsByInstitution).toHaveBeenCalledWith(
        institutionId,
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(mockPosts);
    });
  });

  describe('deletePost', () => {
    it('should delete a post and return 204 status', async () => {
      const postId = 1;
      const req = { user: { id: 1 } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      postService.deletePost = jest.fn().mockResolvedValue(undefined);

      await controller.deletePost(postId, req as any, res as any);

      expect(postService.deletePost).toHaveBeenCalledWith(postId, 1);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Post deleted successfully',
      });
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
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const updatedPost = {
        id: postId,
        body: caption,
        media: { id: 'media-id', url: 'http://example.com/image.jpg' },
      };
      postService.updatePost = jest.fn().mockResolvedValue(updatedPost);

      await controller.updatePost(
        postId,
        caption,
        mockFile,
        req as any,
        res as any,
      );

      expect(postService.updatePost).toHaveBeenCalledWith(
        postId,
        caption,
        mockFile,
        1,
      );
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(updatedPost);
    });
  });
});
