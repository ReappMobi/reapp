import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from '../media-attachment.service';
import { PrismaService } from '../../../database/prisma.service';
import { Queue } from 'bull';
import { HttpException } from '@nestjs/common';
import * as fs from 'fs';
import * as sharp from 'sharp';
import * as mime from 'mime-types';

jest.mock('fs');
jest.mock('sharp');
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));
jest.mock('bull');
jest.mock('fluent-ffmpeg');
jest.mock('mime-types', () => ({
  extension: jest.fn(),
  lookup: jest.fn(),
}));

describe('MediaService', () => {
  let service: MediaService;
  let prismaService: PrismaService;
  let mediaQueue: Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: PrismaService,
          useValue: {
            mediaAttachment: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: 'BullQueue_media-processing',
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prismaService = module.get<PrismaService>(PrismaService);
    mediaQueue = module.get<Queue>('BullQueue_media-processing');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processMedia', () => {
    it('should throw an error if file is missing', async () => {
      const file = null;
      const options = {
        accountId: 1,
        description: 'Test image',
        focus: '0.0,0.0',
      };

      await expect(service.processMedia(file, options)).rejects.toThrow(
        HttpException,
      );
      await expect(service.processMedia(file, options)).rejects.toThrow(
        'File is required',
      );
    });

    it('should throw an error if accountId is missing', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        size: 1024,
      } as Express.Multer.File;

      const options = {
        accountId: null,
        description: 'Test image',
        focus: '0.0,0.0',
      };

      await expect(service.processMedia(file, options)).rejects.toThrow(
        HttpException,
      );
      await expect(service.processMedia(file, options)).rejects.toThrow(
        'Account ID is required',
      );
    });

    it('should throw an error if file type is invalid', async () => {
      const file = {
        mimetype: 'application/pdf',
        buffer: Buffer.from(''),
        originalname: 'test.pdf',
        size: 1024,
      } as Express.Multer.File;

      const options = {
        accountId: 1,
        description: 'Test file',
        focus: '0.0,0.0',
      };

      await expect(service.processMedia(file, options)).rejects.toThrow(
        HttpException,
      );
      await expect(service.processMedia(file, options)).rejects.toThrow(
        'Invalid file type for main file',
      );
    });

    it('should throw an error if file size exceeds limit', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        size: 20 * 1024 * 1024, // 20MB, exceeds 16MB limit
      } as Express.Multer.File;

      const options = {
        accountId: 1,
        description: 'Test image',
        focus: '0.0,0.0',
      };

      await expect(service.processMedia(file, options)).rejects.toThrow(
        HttpException,
      );
      await expect(service.processMedia(file, options)).rejects.toThrow(
        'Main file size exceeds the limit',
      );
    });

    it('should process synchronously when media type is image', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        originalname: 'test.jpg',
        size: 1024,
      } as Express.Multer.File;

      const options = {
        thumbnail: undefined,
        accountId: 1,
        description: 'Test image',
        focus: '0.0,0.0',
      };

      jest.spyOn(service, 'isSynchronous').mockReturnValue(true);
      jest.spyOn(service, 'processSynchronously').mockResolvedValue({
        id: 'mock-id',
        type: 'image',
        url: 'mock-url',
        preview_url: 'mock-preview-url',
        remote_url: null,
        text_url: 'mock-text-url',
        meta: {},
        description: 'mock-description',
        blurhash: 'mock-blurhash',
      });

      const result = await service.processMedia(file, options);

      expect(service.isSynchronous).toHaveBeenCalledWith(file);
      expect(service.processSynchronously).toHaveBeenCalledWith(file, options);
      expect(result).toEqual({
        isSynchronous: true,
        mediaAttachment: {
          id: 'mock-id',
          type: 'image',
          url: 'mock-url',
          preview_url: 'mock-preview-url',
          remote_url: null,
          text_url: 'mock-text-url',
          meta: {},
          description: 'mock-description',
          blurhash: 'mock-blurhash',
        },
      });
    });

    it('should process asynchronously when media type is not image', async () => {
      const file = {
        mimetype: 'video/mp4',
        buffer: Buffer.from(''),
        originalname: 'test.mp4',
        size: 50 * 1024 * 1024, // 50MB
      } as Express.Multer.File;

      const options = {
        thumbnail: undefined,
        accountId: 1,
        description: 'Test video',
        focus: '0.0,0.0',
      };

      jest.spyOn(service, 'isSynchronous').mockReturnValue(false);
      jest.spyOn(service, 'enqueueMediaProcessing').mockResolvedValue({
        id: 'mock-id',
        type: 'video',
        url: null,
        preview_url: null,
        remote_url: null,
        text_url: null,
        meta: null,
        description: 'mock-description',
        blurhash: null,
      });

      const result = await service.processMedia(file, options);

      expect(service.isSynchronous).toHaveBeenCalledWith(file);
      expect(service.enqueueMediaProcessing).toHaveBeenCalledWith(
        file,
        options,
      );
      expect(result).toEqual({
        isSynchronous: false,
        mediaAttachment: {
          id: 'mock-id',
          type: 'video',
          url: null,
          preview_url: null,
          remote_url: null,
          text_url: null,
          meta: null,
          description: 'mock-description',
          blurhash: null,
        },
      });
    });
  });

  describe('enqueueMediaProcessing', () => {
    it('should enqueue media processing job', async () => {
      const file = {
        mimetype: 'video/mp4',
        buffer: Buffer.from('video data'),
        originalname: 'test.mp4',
        size: 50 * 1024 * 1024,
      } as Express.Multer.File;

      const options = {
        thumbnail: undefined,
        accountId: 1,
        description: 'Test video',
        focus: '0.0,0.0',
      };

      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      (mime.extension as jest.Mock).mockReturnValue('mp4');

      prismaService.mediaAttachment.create = jest.fn().mockResolvedValue({
        id: 'mock-uuid',
        description: options.description,
      });

      mediaQueue.add = jest.fn().mockResolvedValue(undefined);

      const result = await service.enqueueMediaProcessing(file, options);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(prismaService.mediaAttachment.create).toHaveBeenCalled();
      expect(mediaQueue.add).toHaveBeenCalled();

      expect(result).toEqual({
        id: 'mock-uuid',
        type: 'video',
        url: null,
        preview_url: null,
        remote_url: null,
        text_url: null,
        meta: null,
        description: options.description,
        blurhash: null,
      });
    });
  });

  describe('processSynchronously', () => {
    it('should process image synchronously', async () => {
      const file = {
        mimetype: 'image/jpeg',
        buffer: Buffer.from('image data'),
        originalname: 'test.jpg',
        size: 1024,
      } as Express.Multer.File;

      const options = {
        thumbnail: undefined,
        accountId: 1,
        description: 'Test image',
        focus: '0.0,0.0',
      };

      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      (fs.statSync as jest.Mock).mockReturnValue({ size: 512 });
      (mime.extension as jest.Mock).mockReturnValue('jpg');

      jest.spyOn(service, 'processImage').mockResolvedValue(undefined);
      jest.spyOn(service, 'generateMeta').mockResolvedValue({});
      jest.spyOn(service, 'generateBlurhash').mockResolvedValue('blurhash');

      prismaService.mediaAttachment.create = jest.fn().mockResolvedValue({
        id: 'mock-uuid',
        description: options.description,
        remoteUrl: '',
      });

      const result = await service.processSynchronously(file, options);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(service.processImage).toHaveBeenCalled();
      expect(service.generateMeta).toHaveBeenCalled();
      expect(service.generateBlurhash).toHaveBeenCalled();
      expect(prismaService.mediaAttachment.create).toHaveBeenCalled();

      expect(result).toEqual({
        id: 'mock-uuid',
        type: 'image',
        url: expect.any(String),
        preview_url: expect.any(String),
        remote_url: null,
        text_url: expect.any(String),
        meta: {},
        description: options.description,
        blurhash: 'blurhash',
      });
    });

    it('should throw error for unsupported media type', async () => {
      const file = {
        mimetype: 'video/mp4',
        buffer: Buffer.from('video data'),
        originalname: 'test.mp4',
        size: 50 * 1024 * 1024,
      } as Express.Multer.File;

      const options = {
        thumbnail: undefined,
        accountId: 1,
        description: 'Test video',
        focus: '0.0,0.0',
      };

      await expect(service.processSynchronously(file, options)).rejects.toThrow(
        HttpException,
      );
      await expect(service.processSynchronously(file, options)).rejects.toThrow(
        'Unsupported media type for synchronous processing',
      );
    });
  });

  describe('getMediaAttachmentById', () => {
    it('should return media attachment when processing is complete', async () => {
      prismaService.mediaAttachment.findUnique = jest.fn().mockResolvedValue({
        id: 'mock-uuid',
        type: 1,
        processing: 2,
        fileContentType: 'image/jpeg',
        thumbnailContentType: 'image/jpeg',
        remoteUrl: '',
        fileMeta: {},
        description: 'Test image',
        blurhash: 'blurhash',
      });

      process.env.BASE_URL = 'http://localhost:3000';

      const result = await service.getMediaAttachmentById('mock-uuid');

      expect(prismaService.mediaAttachment.findUnique).toHaveBeenCalledWith({
        where: { id: 'mock-uuid' },
      });

      expect(result).toEqual({
        mediaResponse: {
          id: 'mock-uuid',
          type: 'image',
          url: 'http://localhost:3000/uploads/mock-uuid/original.jpeg',
          preview_url: 'http://localhost:3000/uploads/mock-uuid/thumbnail.jpeg',
          remote_url: null,
          text_url: null,
          meta: {},
          description: 'Test image',
          blurhash: 'blurhash',
        },
        processing: 2,
      });
    });

    it('should return null when media attachment not found', async () => {
      prismaService.mediaAttachment.findUnique = jest
        .fn()
        .mockResolvedValue(null);

      const result = await service.getMediaAttachmentById('non-existent-id');

      expect(prismaService.mediaAttachment.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });

      expect(result).toEqual({ mediaResponse: null, processing: null });
    });
  });

  describe('isSynchronous', () => {
    it('should return true for image mimetype', () => {
      const file = { mimetype: 'image/jpeg' } as Express.Multer.File;

      const result = service.isSynchronous(file);

      expect(result).toBe(true);
    });

    it('should return false for video mimetype', () => {
      const file = { mimetype: 'video/mp4' } as Express.Multer.File;

      const result = service.isSynchronous(file);

      expect(result).toBe(false);
    });
  });

  describe('determineMediaType', () => {
    it('should return "image" for image mimetypes', () => {
      expect(service.determineMediaType('image/jpeg')).toBe('image');
      expect(service.determineMediaType('image/png')).toBe('image');
    });

    it('should return "video" for video mimetypes', () => {
      expect(service.determineMediaType('video/mp4')).toBe('video');
    });

    it('should return "audio" for audio mimetypes', () => {
      expect(service.determineMediaType('audio/mpeg')).toBe('audio');
    });

    it('should return "gifv" for image/gif mimetype', () => {
      expect(service.determineMediaType('image/gif')).toBe('gifv');
    });

    it('should return "unknown" for unsupported mimetypes', () => {
      expect(service.determineMediaType('application/pdf')).toBe('unknown');
    });
  });

  describe('generateBlurhash', () => {
    it('should generate a blurhash string', async () => {
      const imageBuffer = Buffer.from('image data');

      (sharp as any).mockReturnValue({
        raw: jest.fn().mockReturnThis(),
        ensureAlpha: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue({
          data: new Uint8ClampedArray(32 * 32 * 4),
          info: { width: 32, height: 32, channels: 4 },
        }),
      });

      const blurhash = await service.generateBlurhash(imageBuffer);

      expect(blurhash).toBeDefined();
    });
  });
});
