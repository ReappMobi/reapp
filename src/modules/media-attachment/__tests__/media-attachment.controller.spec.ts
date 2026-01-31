import { Test, TestingModule } from '@nestjs/testing'
import { MediaAttachmentController } from '../media-attachment.controller'
import { MediaService } from '../media-attachment.service'
import { HttpException, HttpStatus } from '@nestjs/common'
import { AuthGuard } from '../../auth/auth.guard'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('MediaAttachmentController', () => {
  let controller: MediaAttachmentController
  let mediaService: MediaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaAttachmentController],
      providers: [
        {
          provide: MediaService,
          useValue: {
            processMedia: vi.fn(),
            getMediaAttachmentById: vi.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      })
      .compile()

    controller = module.get<MediaAttachmentController>(
      MediaAttachmentController,
    )
    mediaService = module.get<MediaService>(MediaService)
  })

  describe('uploadMedia', () => {
    it('should call mediaService.processMedia with correct parameters and respond with 200 when isSynchronous is true', async () => {
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

      const mockThumbnail: Express.Multer.File = {
        fieldname: 'thumbnail',
        originalname: 'thumb.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        size: 512,
        stream: null,
        destination: '',
        filename: '',
        path: '',
      }

      const files = { file: [mockFile], thumbnail: [mockThumbnail] }
      const accountId = 1
      const description = 'Test description'
      const focus = '0.5,0.5'
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any

      mediaService.processMedia = vi.fn().mockResolvedValue({
        isSynchronous: true,
        mediaAttachment: { id: '123' },
      })

      await controller.uploadMedia(files, accountId, description, focus, res)

      expect(mediaService.processMedia).toHaveBeenCalledWith(mockFile, {
        thumbnail: mockThumbnail,
        accountId,
        description,
        focus,
      })

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.send).toHaveBeenCalledWith({ id: '123' })
    })

    it('should call mediaService.processMedia with correct parameters and respond with 202 when isSynchronous is false', async () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.mp4',
        encoding: '7bit',
        mimetype: 'video/mp4',
        buffer: Buffer.from(''),
        size: 1024 * 1024 * 50, // 50MB
        stream: null,
        destination: '',
        filename: '',
        path: '',
      }

      const files = { file: [mockFile], thumbnail: undefined }
      const accountId = 1
      const description = 'Test video upload'
      const focus = '0.5,0.5'
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any

      mediaService.processMedia = vi.fn().mockResolvedValue({
        isSynchronous: false,
        mediaAttachment: { id: '123' },
      })

      await controller.uploadMedia(files, accountId, description, focus, res)

      expect(mediaService.processMedia).toHaveBeenCalledWith(mockFile, {
        thumbnail: undefined,
        accountId,
        description,
        focus,
      })

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.send).toHaveBeenCalledWith({ id: '123' })
    })

    it('should throw an error if mediaService.processMedia throws an error', async () => {
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

      const files = { file: [mockFile], thumbnail: undefined }
      const accountId = 1
      const description = 'Test description'
      const focus = '0.5,0.5'
      const res = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any

      const error = new HttpException('Some error', HttpStatus.BAD_REQUEST)
      mediaService.processMedia = vi.fn().mockRejectedValue(error)

      await expect(
        controller.uploadMedia(files, accountId, description, focus, res),
      ).rejects.toThrow(error)

      expect(mediaService.processMedia).toHaveBeenCalledWith(mockFile, {
        thumbnail: undefined,
        accountId,
        description,
        focus,
      })
    })
  })

  describe('getMediaAttachment', () => {
    it('should return 404 if media attachment not found', async () => {
      const id = '123'
      const req = {} as any
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any

      mediaService.getMediaAttachmentById = vi.fn().mockResolvedValue({
        mediaResponse: null,
        processing: null,
      })

      await controller.getMediaAttachment(id, req, res)

      expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
      expect(res.json).toHaveBeenCalledWith({ error: 'Record not found' })
    })

    it('should return 200 with media response when processing is complete', async () => {
      const id = '123'
      const req = {} as any
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any

      const mockMediaResponse = {
        id: '123',
        url: 'http://example.com/media/123',
      }

      mediaService.getMediaAttachmentById = vi.fn().mockResolvedValue({
        mediaResponse: mockMediaResponse,
        processing: 2, // Processing complete
      })

      await controller.getMediaAttachment(id, req, res)

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK)
      expect(res.json).toHaveBeenCalledWith(mockMediaResponse)
    })

    it('should return 206 with media response when processing is in progress', async () => {
      const id = '123'
      const req = {} as any
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any

      const mockMediaResponse = { id: '123', url: null }

      mediaService.getMediaAttachmentById = vi.fn().mockResolvedValue({
        mediaResponse: mockMediaResponse,
        processing: 1, // Processing in progress
      })

      await controller.getMediaAttachment(id, req, res)

      expect(res.status).toHaveBeenCalledWith(HttpStatus.PARTIAL_CONTENT)
      expect(res.json).toHaveBeenCalledWith(mockMediaResponse)
    })

    it('should return 422 if processing failed', async () => {
      const id = '123'
      const req = {} as any
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any

      mediaService.getMediaAttachmentById = vi.fn().mockResolvedValue({
        mediaResponse: {},
        processing: -1, // Processing failed
      })

      await controller.getMediaAttachment(id, req, res)

      expect(res.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY)
      expect(res.json).toHaveBeenCalledWith({
        error: 'There was an error processing the media attachment',
      })
    })

    it('should return 500 for unknown processing status', async () => {
      const id = '123'
      const req = {} as any
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any

      mediaService.getMediaAttachmentById = vi.fn().mockResolvedValue({
        mediaResponse: {},
        processing: 99, // Unknown status
      })

      await controller.getMediaAttachment(id, req, res)

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unknown processing status',
      })
    })
  })
})
