import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../auth/auth.guard'
import { PostController } from '../post.controller'
import { PostService } from '../post.service'

describe('PostController', () => {
  let controller: PostController
  let postService: PostService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        {
          provide: PostService,
          useValue: {
            findInstitutionByAccountId: vi.fn(),
            postPublication: vi.fn(),
            getAllPosts: vi.fn(),
            getPostsByInstitution: vi.fn(),
            deletePost: vi.fn(),
            updatePost: vi.fn(),
            addComment: vi.fn(),
            likePost: vi.fn(),
            unlikePost: vi.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      })
      .compile()

    controller = module.get<PostController>(PostController)
    postService = module.get<PostService>(PostService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

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
      }

      const accountId = 1
      const caption = 'Test caption'
      const institution = { id: 1 }
      const userId = 1
      const req = { user: { id: userId } }

      postService.findInstitutionByAccountId = vi
        .fn()
        .mockResolvedValue(institution)
      postService.postPublication = vi
        .fn()
        .mockResolvedValue({ id: 1, body: caption })

      const result = await controller.postPublication(
        mockFile,
        caption,
        req as any,
      )

      expect(postService.findInstitutionByAccountId).toHaveBeenCalledWith(
        accountId,
      )
      expect(postService.postPublication).toHaveBeenCalledWith(
        caption,
        mockFile,
        institution.id,
        accountId,
      )

      expect(result).toEqual({ id: 1, body: caption })
    })

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
      }

      const caption = 'Test caption'
      const req = { user: { id: 2 } } // Different userId

      postService.findInstitutionByAccountId = vi.fn().mockResolvedValue(null)

      await expect(
        controller.postPublication(mockFile, caption, req as any),
      ).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('getAllPosts', () => {
    it('should return all posts with status 200', async () => {
      const mockPosts = [
        { id: 1, body: 'Post 1' },
        { id: 2, body: 'Post 2' },
      ]
      postService.getAllPosts = vi.fn().mockResolvedValue(mockPosts)

      const result = await controller.getAllPosts()

      expect(postService.getAllPosts).toHaveBeenCalled()
      expect(result).toEqual(mockPosts)
    })
  })

  describe('getPostsByInstitution', () => {
    it('should return posts for a specific institution with status 200', async () => {
      const institutionId = 1

      const mockPosts = [
        { id: 1, body: 'Post 1', institutionId },
        { id: 2, body: 'Post 2', institutionId },
      ]
      postService.getPostsByInstitution = vi.fn().mockResolvedValue(mockPosts)

      const result = await controller.getPostsByInstitution(institutionId)

      expect(postService.getPostsByInstitution).toHaveBeenCalledWith(
        institutionId,
      )

      expect(result).toEqual(mockPosts)
    })
  })

  describe('deletePost', () => {
    it('should delete a post and return 204 status', async () => {
      const postId = 1
      const req = { user: { id: 1 } }

      postService.deletePost = vi.fn().mockResolvedValue(undefined)

      const result = await controller.deletePost(postId, req as any)

      expect(postService.deletePost).toHaveBeenCalledWith(postId, 1)
      expect(result).toEqual({ message: 'Post deletado com sucesso' })
    })
  })

  describe('updatePost', () => {
    it('should update a post and return the updated post', async () => {
      const postId = 1
      const caption = 'Updated caption'
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
      }

      const req = { user: { id: 1 } }

      const updatedPost = {
        id: postId,
        body: caption,
        media: { id: 'media-id', url: 'http://example.com/image.jpg' },
      }
      postService.updatePost = vi.fn().mockResolvedValue(updatedPost)

      const result = await controller.updatePost(
        postId,
        caption,
        mockFile,
        req as any,
      )

      expect(postService.updatePost).toHaveBeenCalledWith(
        postId,
        caption,
        mockFile,
        1,
      )

      expect(result).toEqual(updatedPost)
    })
  })

  describe('addComment', () => {
    it('should add a comment and return it', async () => {
      const postId = 1
      const body = 'My comment'
      const req = { user: { id: 1 } }
      const mockComment = { id: 10, body: 'My comment', postId: 1 }
      ;(postService.addComment as Mock).mockResolvedValue(mockComment)

      const result = await controller.addComment(postId, body, req as any)

      expect(postService.addComment).toHaveBeenCalledWith(postId, 1, body)
      expect(result).toEqual(mockComment)
    })

    it('should throw if addComment fails with an HttpException', async () => {
      const postId = 1
      const body = 'Fail comment'
      const req = { user: { id: 1 } }
      ;(postService.addComment as Mock).mockRejectedValue(
        new HttpException('Post não encontrado', HttpStatus.NOT_FOUND),
      )

      await expect(
        controller.addComment(postId, body, req as any),
      ).rejects.toThrow('Post não encontrado')
    })
  })

  describe('likePost', () => {
    it('should like a post and return the like object', async () => {
      const postId = 1
      const req = { user: { id: 2 } }
      const mockLike = { id: 5, postId, donorId: 2 }
      ;(postService.likePost as Mock).mockResolvedValue(mockLike)

      const result = await controller.likePost(postId, req as any)

      expect(postService.likePost).toHaveBeenCalledWith(postId, 2)
      expect(result).toEqual(mockLike)
    })

    it('should throw if likePost fails with an HttpException', async () => {
      const postId = 2
      const req = { user: { id: 3 } }
      ;(postService.likePost as Mock).mockRejectedValue(
        new HttpException(
          'Post já curtido pelo usuário',
          HttpStatus.BAD_REQUEST,
        ),
      )

      await expect(controller.likePost(postId, req as any)).rejects.toThrow(
        'Post já curtido pelo usuário',
      )
    })
  })

  describe('unlikePost', () => {
    it('should unlike a post and return success message', async () => {
      const postId = 1
      const req = { user: { id: 2 } }
      ;(postService.unlikePost as Mock).mockResolvedValue(undefined)

      const result = await controller.unlikePost(postId, req as any)

      expect(postService.unlikePost).toHaveBeenCalledWith(postId, 2)
      expect(result).toEqual({ message: 'Post descurtido com sucesso' })
    })

    it('should throw if unlikePost fails with an HttpException', async () => {
      const postId = 1
      const req = { user: { id: 2 } }
      ;(postService.unlikePost as Mock).mockRejectedValue(
        new HttpException(
          'Esse usuário não curtiu este post',
          HttpStatus.BAD_REQUEST,
        ),
      )

      await expect(controller.unlikePost(postId, req as any)).rejects.toThrow(
        'Esse usuário não curtiu este post',
      )
    })
  })
})
