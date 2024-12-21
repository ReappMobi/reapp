import { InjectQueue } from '@nestjs/bull';
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { encode } from 'blurhash';
import { Queue } from 'bull';
import * as ffmpeg from 'fluent-ffmpeg';
import * as mime from 'mime-types';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';

import {
  AUDIO_MIME_TYPES,
  MAX_IMAGE_SIZE,
  SUPPORTED_IMAGE_MIME_TYPES,
  MAX_VIDEO_FRAME_RATE,
  MAX_VIDEO_MATRIX_LIMIT,
  SUPPORTED_MIME_TYPES,
  MAX_THUMBNAIL_SIZE,
  MAX_VIDEO_SIZE,
  VIDEO_MIME_TYPES,
} from './media-attachment.constants';

interface VideoMetadata {
  length: string;
  duration: number;
  fps: number;
  size: string;
  width: number;
  height: number;
  aspect: number;
  audio_encode: string | null;
  audio_bitrate: number | null;
  audio_channels: number | null;
  original: {
    width: number;
    height: number;
    frame_rate: string;
    duration: number;
    bitrate: number;
  };
}

type UploadOptions = {
  thumbnail?: Express.Multer.File;
  accountId: number;
  description?: string;
  focus?: string;
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue('media-processing') private mediaQueue: Queue,
  ) {}

  private validateMediaFile(file: Express.Multer.File) {
    if (!file || !file.mimetype) {
      throw new HttpException(
        'Arquivo inválido',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Only include image or video files
    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
      throw new HttpException(
        'Formato de arquivo não suportado',
        HttpStatus.BAD_REQUEST,
      );
    }

    let fileSizeLimit = MAX_VIDEO_SIZE;
    if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      fileSizeLimit = MAX_IMAGE_SIZE;
    }

    if (file.size > fileSizeLimit) {
      throw new HttpException(
        'Tamanho do arquivo excede o limite',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private validateThumbnailFile(thumbnailFile?: Express.Multer.File) {
    if (thumbnailFile && thumbnailFile.mimetype) {
      if (!SUPPORTED_IMAGE_MIME_TYPES.includes(thumbnailFile.mimetype)) {
        throw new HttpException(
          'Formato de arquivo de miniatura não suportado',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      if (thumbnailFile.size > MAX_THUMBNAIL_SIZE) {
        throw new HttpException(
          'Tamanho do arquivo de miniatura excede o limite',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }
  }

  private isSynchronous(file: Express.Multer.File): boolean {
    const mediaType = this.getMediaTypeFromMime(file.mimetype);
    return mediaType === 'image';
  }

  private getMediaTypeFromMime(mimeType: string): string {
    if (SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType)) {
      if (mimeType === 'image/gif') return 'gifv';
      return 'image';
    }
    if (VIDEO_MIME_TYPES.includes(mimeType)) return 'video';
    if (AUDIO_MIME_TYPES.includes(mimeType)) return 'audio';
    return 'unknown';
  }

  private async processImage(
    file: Express.Multer.File,
    filePath: string,
    isThumbnail = false,
  ): Promise<sharp.OutputInfo> {
    if (isThumbnail) {
      return await sharp(file.buffer)
        .resize(480, 270, { fit: 'inside' })
        .toFile(filePath);
    }
    return await sharp(file.buffer).toFile(filePath);
  }

  private async createMediaMetadata(
    file: Express.Multer.File,
    focus: string,
    type: string,
  ) {
    let meta = {};
    const focusPoint = this.parseFocus(focus);

    if (type === 'image' || type === 'gifv') {
      try {
        const originalMetadata = await sharp(file.buffer).metadata();
        const originalMeta = {
          width: originalMetadata.width,
          height: originalMetadata.height,
          size: `${originalMetadata.width}x${originalMetadata.height}`,
          aspect: originalMetadata.width / originalMetadata.height,
        };

        meta = {
          focus: focusPoint,
          original: originalMeta,
        };
      } catch (error) {
        console.error('Error extracting original image metadata:', error);
        meta = {
          focus: focusPoint,
        };
      }
    } else if (type === 'video') {
      try {
        const videoMeta = await this.getVideoMetadata(file.buffer);
        meta = {
          ...videoMeta,
          focus: focusPoint,
        };
      } catch (error) {
        console.error('Error extracting video metadata:', error);
        meta = {
          focus: focusPoint,
        };
      }
    }

    return meta;
  }

  private getTypeEnum(type: string): number {
    const getTypeEnum = {
      image: 1,
      video: 2,
      gifv: 3,
      audio: 4,
    };
    return getTypeEnum[type] || 0;
  }
  private async processSynchronously(
    file: Express.Multer.File,
    options: UploadOptions,
  ) {
    const fileType = this.getFileType(file.mimetype);

    if (fileType !== 'image') {
      throw new HttpException(
        'O processamento síncrono é suportado apenas para imagens',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const { thumbnail, accountId, description, focus } = options;

    const mediaId = uuidv4();
    const uploadDir =
      process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

    const mediaDir = path.join(uploadDir, mediaId);

    fs.mkdirSync(mediaDir, { recursive: true });

    const originalExtension = mime.extension(file.mimetype);

    const extension = originalExtension && `.${originalExtension}`;

    const originalFileName = `original${extension}`;

    const originalFilePath = path.join(mediaDir, originalFileName);

    const fileInfo = await this.processImage(file, originalFilePath);

    const fileBlurhash = await this.generateBlurhash(file.buffer);

    const fileMeta = await this.createMediaMetadata(file, focus, fileType);

    const uploadBaseUrl = `${process.env.BASE_URL}/uploads`;
    const mediaUploadUrl = `${uploadBaseUrl}/${mediaId}/`;
    const mediaUrl = `${mediaUploadUrl}/${originalFileName}`;

    let thumbnailData = {};
    if (thumbnail) {
      const thumbnailFileExtension = mime.extension(thumbnail.mimetype);
      const thumbnailExtension = thumbnailFileExtension
        ? `.${thumbnailFileExtension}`
        : '.png';

      const thumbnailFileName = `thumbnail.${thumbnailExtension}`;
      const thumbnailFilePath = path.join(mediaDir, thumbnailFileName);
      const thumbnailUpdatedAt: Date = new Date();
      const thumbnailContentType: string = thumbnail
        ? thumbnail.mimetype
        : 'image/png';
      const thumb = await this.processImage(thumbnail, thumbnailFilePath, true);
      const thumbnailFileSize = thumb.size;
      const thumbnailMeta = await this.createMediaMetadata(
        thumbnail,
        focus,
        'image',
      );

      const thumbnailRemoteUrl = `${uploadBaseUrl}/${mediaId}/thumbnail.${thumbnailExtension}`;
      fileMeta['small'] = thumbnailMeta;

      thumbnailData = {
        thumbnailFileName,
        thumbnailContentType,
        thumbnailFileSize,
        thumbnailUpdatedAt,
        thumbnailRemoteUrl,
      };
    }

    const mediaAttachment = await this.prismaService.mediaAttachment.create({
      data: {
        id: mediaId,
        fileFileName: file.originalname,
        fileContentType: file.mimetype,
        fileFileSize: fileInfo.size,
        accountId,
        remoteUrl: mediaUrl,
        shortcode: uuidv4(),
        type: this.getTypeEnum(fileType),
        fileMeta: fileMeta,
        description: description,
        blurhash: fileBlurhash,
        processing: 2,
        fileStorageSchemaVersion: 1,
        ...thumbnailData,
      },
    });

    return mediaAttachment;
  }

  async processMedia(file: Express.Multer.File, options: UploadOptions) {
    const { thumbnail, accountId, description, focus } = options;

    if (!file) {
      throw new HttpException(
        'O arquivo é obrigatório',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!accountId) {
      throw new HttpException(
        'A conta é obrigatória',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    this.validateMediaFile(file);
    const isSynchronous = this.isSynchronous(file);

    if (isSynchronous) {
      const mediaAttachment = await this.processSynchronously(file, {
        thumbnail,
        accountId,
        description,
        focus,
      });
      return { isSynchronous: true, mediaAttachment };
    } else {
      const mediaAttachment = await this.enqueueMediaProcessing(file, {
        thumbnail,
        accountId,
        description,
        focus,
      });

      return { isSynchronous: false, mediaAttachment };
    }
  }

  async deleteMediaAttachment(id: string): Promise<void> {
    const mediaAttachment = await this.prismaService.mediaAttachment.findUnique(
      {
        where: { id },
      },
    );

    if (!mediaAttachment) {
      throw new NotFoundException('Media attachment não encontrado');
    }

    // Determina os caminhos dos arquivos
    const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
    const mediaDir = path.join(uploadsDir, mediaAttachment.id);

    // Remove os arquivos associados ao media attachment
    try {
      // Verifica se o diretório existe
      await promisify(fs.access)(mediaDir, fs.constants.F_OK);

      // Remove o diretório e seu conteúdo
      await promisify(fs.rm)(mediaDir, { recursive: true, force: true });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Erro ao deletar os arquivos de mídia: ${error}`);
        throw new HttpException(
          'Falha ao deletar os arquivos de mídia',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // Se o erro for ENOENT (diretório não existe), continua
    }

    // Deleta o registro do media attachment no banco de dados
    await this.prismaService.mediaAttachment.delete({
      where: { id },
    });
  }

  private validateFiles(
    file: Express.Multer.File,
    thumbnail: Express.Multer.File | undefined,
  ) {
    const allowedImageTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    const allowedVideoTypes = ['video/mp4', 'video/x-matroska', 'video/webm'];

    const imageSizeLimit = 16 * 1024 * 1024; // 16MB for images
    const videoSizeLimit = 99 * 1024 * 1024; // 99MB for videos
    const thumbnailSizeLimit = 5 * 1024 * 1024; // 5MB for thumbnails

    let mainFileSizeLimit = 0;
    if (allowedImageTypes.includes(file.mimetype)) {
      mainFileSizeLimit = imageSizeLimit;
    } else if (allowedVideoTypes.includes(file.mimetype)) {
      mainFileSizeLimit = videoSizeLimit;
    } else {
      throw new HttpException(
        'Invalid file type for main file',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (file.size > mainFileSizeLimit) {
      throw new HttpException(
        'Main file size exceeds the limit',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (thumbnail) {
      if (!allowedImageTypes.includes(thumbnail.mimetype)) {
        throw new HttpException(
          'Invalid file type for thumbnail',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      if (thumbnail.size > thumbnailSizeLimit) {
        throw new HttpException(
          'Thumbnail size exceeds the limit',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }
  }

  async enqueueMediaProcessing(
    file: Express.Multer.File,
    options: {
      thumbnail: Express.Multer.File | undefined;
      accountId: number;
      description: string;
      focus: string;
    },
  ) {
    const { thumbnail, accountId, description, focus } = options;
    this.validateMediaFile(file);

    const mediaId = uuidv4();
    const tempDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'temp_uploads',
      mediaId,
    );
    fs.mkdirSync(tempDir, { recursive: true });
    const originalExtension = mime.extension(file.mimetype);
    const originalExtensionWithDot = originalExtension
      ? `.${originalExtension}`
      : '';

    const originalFileName = `original${originalExtensionWithDot}`;

    const originalFilePath = path.join(tempDir, originalFileName);

    fs.writeFileSync(originalFilePath, file.buffer);

    let thumbnailFilePath: string | undefined;
    if (thumbnail) {
      let thumbnailExtension = '.png';
      const thumbExtension = mime.extension(thumbnail.mimetype);
      if (thumbExtension) {
        thumbnailExtension = `.${thumbExtension}`;
      }
      const thumbnailFileName = `thumbnail${thumbnailExtension}`;
      thumbnailFilePath = path.join(tempDir, thumbnailFileName);
      fs.writeFileSync(thumbnailFilePath, thumbnail.buffer);
    }

    const type = this.getMediaTypeFromMime(file.mimetype);

    const mediaAttachment = await this.prismaService.mediaAttachment.create({
      data: {
        id: mediaId,
        fileFileName: file.originalname,
        fileContentType: file.mimetype,
        fileFileSize: file.size,
        fileUpdatedAt: new Date(),
        remoteUrl: '',
        accountId,
        createdAt: new Date(),
        updatedAt: new Date(),
        shortcode: uuidv4(),
        type: this.getTypeEnum(type),
        fileMeta: null, // Will be filled after processing
        description: description || null,
        blurhash: null, // Will be filled after processing
        processing: 0, // 0 indicates processing not started
        fileStorageSchemaVersion: 1,
        thumbnailFileName: thumbnail ? thumbnail.originalname : 'thumbnail',
        thumbnailContentType: thumbnail ? thumbnail.mimetype : null,
        thumbnailFileSize: thumbnail ? thumbnail.size : null,
        thumbnailUpdatedAt: new Date(),
        thumbnailRemoteUrl: '',
      },
    });

    await this.mediaQueue.add('process-media', {
      mediaId: mediaAttachment.id,
      filePath: originalFilePath,
      thumbnailFilePath,
      description,
      focus,
    });

    const response = {
      id: mediaAttachment.id.toString(),
      type: type,
      url: null, // Will be available after processing
      preview_url: null, // Will be available after processing
      remote_url: null,
      text_url: null,
      meta: null,
      description: mediaAttachment.description,
      blurhash: null,
    };

    return response;
  }

  async getMediaAttachmentsByIds(mediaIds: string[]) {
    const mediaAttachments = await this.prismaService.mediaAttachment.findMany({
      where: {
        id: { in: mediaIds },
      },
    });

    const baseUrl = `${process.env.BASE_URL}/uploads`;

    const mediaAttachmentMap = new Map<string, any>();
    mediaAttachments.forEach((mediaAttachment) => {
      mediaAttachmentMap.set(mediaAttachment.id, mediaAttachment);
    });

    const mediaResponses = mediaIds.map((id) => {
      const mediaAttachment = mediaAttachmentMap.get(id);

      if (!mediaAttachment) {
        return { mediaResponse: null, processing: null };
      }

      const processing = mediaAttachment.processing;
      const isProcessed = processing === 2;

      const originalFileExtension = mediaAttachment.fileContentType
        ? mediaAttachment.fileContentType.split('/')[1]
        : '';
      const thumbnailFileExtension = mediaAttachment.thumbnailContentType
        ? mediaAttachment.thumbnailContentType.split('/')[1]
        : '';

      const mediaResponse = {
        id: mediaAttachment.id.toString(),
        type: this.getTypeStr(mediaAttachment.type),
        url:
          isProcessed && originalFileExtension
            ? `${baseUrl}/${mediaAttachment.id}/original.${originalFileExtension}`
            : null,
        preview_url:
          isProcessed && thumbnailFileExtension
            ? `${baseUrl}/${mediaAttachment.id}/thumbnail.${thumbnailFileExtension}`
            : null,
        remote_url: mediaAttachment.remoteUrl || null,
        text_url: null,
        meta: isProcessed ? mediaAttachment.fileMeta : null,
        description: mediaAttachment.description,
        blurhash: isProcessed ? mediaAttachment.blurhash : null,
      };

      return { mediaResponse, processing };
    });

    return mediaResponses;
  }

  async getMediaAttachmentById(id: string) {
    const mediaAttachment = await this.prismaService.mediaAttachment.findUnique(
      {
        where: { id: id },
      },
    );

    if (!mediaAttachment) {
      return { mediaResponse: null, processing: null };
    }

    const baseUrl = `${process.env.BASE_URL}/uploads`;
    const processing = mediaAttachment.processing;

    const isProcessed = processing === 2;

    const originalFileExtension = mediaAttachment.fileContentType.split('/')[1];
    const thumbnailFileExtension =
      mediaAttachment.thumbnailContentType.split('/')[1];
    const mediaResponse = {
      id: mediaAttachment.id.toString(),
      type: this.getTypeStr(mediaAttachment.type),
      url: isProcessed
        ? `${baseUrl}/${mediaAttachment.id}/original.${originalFileExtension}`
        : null,
      preview_url: isProcessed
        ? `${baseUrl}/${mediaAttachment.id}/thumbnail.${thumbnailFileExtension}`
        : null,
      remote_url: mediaAttachment.remoteUrl || null,
      text_url: null,
      meta: isProcessed ? mediaAttachment.fileMeta : null,
      description: mediaAttachment.description,
      blurhash: isProcessed ? mediaAttachment.blurhash : null,
    };

    return { mediaResponse, processing };
  }

  isSynchronous(file: Express.Multer.File): boolean {
    const mediaType = this.determineMediaType(file.mimetype);
    return mediaType === 'image';
  }

  determineMediaType(mimeType: string): string {
    if (IMAGE_MIME_TYPES.includes(mimeType)) {
      if (mimeType === 'image/gif') return 'gifv'; // Mastodon treats GIFs as 'gifv'
      return 'image';
    }
    if (VIDEO_MIME_TYPES.includes(mimeType)) return 'video';
    if (AUDIO_MIME_TYPES.includes(mimeType)) return 'audio';
    return 'unknown';
  }

  async processSynchronously(
    file: Express.Multer.File,
    options: {
      thumbnail: Express.Multer.File | undefined;
      accountId: number;
      description: string;
      focus: string;
    },
  ) {
    const { thumbnail, accountId, description, focus } = options;
    this.validateFile(file);

    const mediaId = uuidv4();
    const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads');
    const mediaDir = path.join(uploadDir, mediaId.toString());

    fs.mkdirSync(mediaDir, { recursive: true });

    const originalExtension = mime.extension(file.mimetype);
    const originalExtensionWithDot = originalExtension
      ? `.${originalExtension}`
      : '';

    const originalFileName = `original${originalExtensionWithDot}`;

    const originalFilePath = path.join(mediaDir, originalFileName);

    let thumbnailExtension = 'png';
    if (thumbnail) {
      const thumbExtension = mime.extension(thumbnail.mimetype);
      if (thumbExtension) {
        thumbnailExtension = `.${thumbExtension}`;
      }
    }

    const thumbnailFileName = `thumbnail.${thumbnailExtension}`;
    const thumbnailFilePath = path.join(mediaDir, thumbnailFileName);

    fs.writeFileSync(originalFilePath, file.buffer);

    const type = this.determineMediaType(file.mimetype);

    if (type !== 'image') {
      throw new HttpException(
        'Unsupported media type for synchronous processing',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const thumbnailUpdatedAt: Date = new Date();

    await this.processImage(file, thumbnail, thumbnailFilePath);
    const thumbnailContentType: string = thumbnail
      ? thumbnail.mimetype
      : 'image/png';
    const thumbnailFileSize: number = fs.statSync(thumbnailFilePath).size;

    const baseUrl = `${process.env.BASE_URL}/uploads`;
    const url = `${baseUrl}/${mediaId}/original.${originalExtension}`;
    const preview_url = `${baseUrl}/${mediaId}/thumbnail.${thumbnailExtension}`;
    const text_url = `${baseUrl}/${mediaId}`;

    const meta = await this.generateMeta(file, thumbnailFilePath, focus, type);

    let blurhash: string | null = null;
    if (type === 'image' || type === 'video' || type === 'gifv') {
      const blurhashBuffer =
        thumbnail && thumbnail.buffer ? thumbnail.buffer : file.buffer;
      blurhash = await this.generateBlurhash(blurhashBuffer);
    }

    const mediaAttachment = await this.prismaService.mediaAttachment.create({
      data: {
        id: mediaId,
        fileFileName: file.originalname,
        fileContentType: file.mimetype,
        fileFileSize: file.size,
        fileUpdatedAt: new Date(),
        accountId,
        remoteUrl: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        shortcode: uuidv4(),
        type: this.getTypeEnum(type),
        fileMeta: meta,
        description: description || null,
        blurhash: blurhash,
        processing: 2, // 2 indicates processing is complete
        fileStorageSchemaVersion: 1,
        thumbnailFileName: thumbnail ? thumbnail.originalname : 'thumbnail',
        thumbnailContentType: thumbnailContentType,
        thumbnailFileSize: thumbnailFileSize,
        thumbnailUpdatedAt: thumbnailUpdatedAt,
        thumbnailRemoteUrl: '',
      },
    });

    const response = {
      id: mediaAttachment.id.toString(),
      type: type,
      url: url,
      preview_url: preview_url,
      remote_url: mediaAttachment.remoteUrl || null,
      text_url: text_url,
      meta: meta,
      description: mediaAttachment.description,
      blurhash: blurhash,
    };

    return response;
  }

  async processAsynchronously(
    mediaId: string,
    originalFilePath: string,
    thumbnailFilePath: string | undefined,
    description: string,
    focus: string,
  ) {
    await this.updateMediaProcessingStatus(mediaId, 'processing');

    const fileBuffer = fs.readFileSync(originalFilePath);
    const originalFileType = path.extname(originalFilePath);
    let thumbnailBuffer: Buffer | undefined;
    let thumbnailFileType: string | undefined;
    if (thumbnailFilePath) {
      thumbnailBuffer = fs.readFileSync(thumbnailFilePath);
      thumbnailFileType = path.extname(thumbnailFilePath);
    }

    const mediaData = await this.processMediaFile(
      mediaId,
      fileBuffer,
      thumbnailBuffer,
      description,
      focus,
      originalFileType,
      thumbnailFileType,
    );

    // Clean up temporary files
    fs.unlinkSync(originalFilePath);
    if (thumbnailFilePath) {
      fs.unlinkSync(thumbnailFilePath);
    }

    // Update processing status to 'complete' (2)
    await this.updateMediaProcessingStatus(mediaId, 'complete', mediaData);
  }

  async processMediaFile(
    mediaId: string,
    fileBuffer: Buffer,
    thumbnailBuffer: Buffer | undefined,
    description: string,
    focus: string,
    originalFileType: string,
    thumbnailFileType: string | undefined,
  ) {
    const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads');
    const mediaDir = path.join(uploadDir, mediaId.toString());
    fs.mkdirSync(mediaDir, { recursive: true });

    const originalFileName = `original${originalFileType}`;
    const originalFilePath = path.join(mediaDir, originalFileName);
    fs.writeFileSync(originalFilePath, fileBuffer);

    let thumbnailFileExtension: string;
    if (thumbnailFileType) {
      thumbnailFileExtension = thumbnailFileType;
    } else {
      // Default to .png if thumbnailBuffer is not provided
      thumbnailFileExtension = '.png';
    }

    let thumbnailFileSize: number | undefined;
    if (thumbnailBuffer) {
      thumbnailFileSize = thumbnailBuffer.byteLength;
    }

    // Process video
    const thumbnailFilePath = path.join(
      mediaDir,
      `thumbnail${thumbnailFileExtension}`,
    );
    await this.processVideo(
      originalFilePath,
      thumbnailFilePath,
      thumbnailBuffer,
    );

    const fileMeta = await this.generateMetaForVideo(
      originalFilePath,
      thumbnailFilePath,
      focus,
    );
    const blurhash = await this.generateBlurhash(
      fs.readFileSync(thumbnailFilePath),
    );

    return {
      fileMeta,
      blurhash,
      thumbnailFileSize,
      thumbnailContentType: `image/${thumbnailFileExtension.split('.')[1]}`,
    };
  }

  async generateMetaForVideo(
    originalFilePath: string,
    thumbnailFilePath: string,
    focus: string,
  ) {
    const videoMeta = await this.getVideoMetadataFromFile(originalFilePath);

    const thumbnailBuffer = fs.readFileSync(thumbnailFilePath);
    const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();
    const smallMeta = {
      width: thumbnailMetadata.width,
      height: thumbnailMetadata.height,
      size: `${thumbnailMetadata.width}x${thumbnailMetadata.height}`,
      aspect: thumbnailMetadata.width / thumbnailMetadata.height,
    };

    const focusPoint = this.parseFocus(focus);

    const meta = {
      ...videoMeta,
      small: smallMeta,
      focus: focusPoint,
    };

    return meta;
  }

  async getVideoMetadataFromFile(filePath: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) return reject(err);

        try {
          // Extract video stream
          const videoStream = data.streams.find(
            (stream) => stream.codec_type === 'video',
          );
          if (!videoStream) {
            return reject(new Error('No video stream found'));
          }

          // Extract audio stream
          const audioStream = data.streams.find(
            (stream) => stream.codec_type === 'audio',
          );

          // Extract video metadata
          const durationValue = data.format.duration;
          let duration: number;

          if (typeof durationValue === 'string') {
            duration = parseFloat(durationValue);
          } else if (typeof durationValue === 'number') {
            duration = durationValue;
          } else {
            duration = 0;
          }

          const length = this.formatDuration(duration);

          const width = videoStream.width || 0;
          const height = videoStream.height || 0;
          const size = `${width}x${height}`;
          const aspect =
            width && height ? parseFloat((width / height).toFixed(7)) : 0;

          const frameRateStr =
            videoStream.r_frame_rate || videoStream.avg_frame_rate;
          const fps = frameRateStr
            ? parseFloat(this.parseFrameRate(frameRateStr).toFixed(2))
            : 0;

          const bitrateValue = videoStream.bit_rate || data.format.bit_rate;
          let bitrate: number;
          if (typeof bitrateValue === 'string') {
            bitrate = parseInt(bitrateValue, 10);
          } else if (typeof bitrateValue === 'number') {
            bitrate = bitrateValue;
          } else {
            bitrate = 0;
          }

          // Original metadata
          const original = {
            width,
            height,
            frame_rate: frameRateStr,
            duration,
            bitrate,
          };

          // Audio metadata
          let audio_encode = null;
          let audio_bitrate = null;
          let audio_channels = null;

          if (audioStream) {
            audio_encode =
              `${audioStream.codec_long_name || ''} (${audioStream.codec_name || ''} / ${audioStream.codec_tag_string || ''})`.trim();
            audio_bitrate = audioStream.sample_rate
              ? `${audioStream.sample_rate} Hz`
              : null;
            audio_channels = audioStream.channels
              ? this.getAudioChannelLayout(audioStream.channels)
              : null;
          }

          const meta = {
            length,
            duration: parseFloat(duration.toFixed(2)),
            fps,
            size,
            width,
            height,
            aspect,
            audio_encode,
            audio_bitrate,
            audio_channels,
            original,
          };

          resolve(meta);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  parseFrameRate(frameRateStr: string): number {
    if (!frameRateStr) {
      return 0;
    }
    const parts = frameRateStr.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      if (denominator !== 0) {
        return numerator / denominator;
      }
    }
    return parseFloat(frameRateStr) || 0;
  }

  getAudioChannelLayout(channels: number): string {
    switch (channels) {
      case 1:
        return 'mono';
      case 2:
        return 'stereo';
      default:
        return `${channels} channels`;
    }
  }

  async processVideo(
    originalFilePath: string,
    thumbnailFilePath: string,
    thumbnailBuffer: Buffer | undefined,
  ) {
    const processedFilePath = originalFilePath + '_processed.mp4';
    const backupFilePath = originalFilePath + '_backup';

    try {
      fs.renameSync(originalFilePath, backupFilePath);

      // Transcode the video
      const transcodingCommand = ffmpeg(backupFilePath)
        .outputOptions([
          '-c:v libx264',
          '-preset veryfast',
          '-crf 23',
          '-c:a aac',
          '-b:a 128k',
        ])
        .save(processedFilePath);

      await new Promise<void>((resolve, reject) => {
        transcodingCommand
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err));
      });
      // Replace the original file with the processed file
      fs.renameSync(processedFilePath, originalFilePath);

      // Delete the backup file
      fs.unlinkSync(backupFilePath);

      if (thumbnailBuffer) {
        fs.writeFileSync(thumbnailFilePath, thumbnailBuffer);
      } else {
        const thumbnailCommand = ffmpeg(originalFilePath).screenshots({
          timestamps: [1],
          filename: path.basename(thumbnailFilePath),
          folder: path.dirname(thumbnailFilePath),
          size: '640x?',
        });

        await new Promise<void>((resolve, reject) => {
          thumbnailCommand
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err));
        });
      }
    } catch (error) {
      console.error('Error processing video:', error);
      if (fs.existsSync(processedFilePath)) {
        fs.unlinkSync(processedFilePath);
      }
      // Restore the original file if necessary
      if (fs.existsSync(backupFilePath)) {
        fs.renameSync(backupFilePath, originalFilePath);
      }
      throw error;
    }
  }

  getMimeType(filePath: string): string | null {
    const mimeType = mime.lookup(filePath);

    return mimeType || null;
  }

  async updateMediaProcessingStatus(
    mediaId: string,
    status: 'processing' | 'complete' | 'failed',
    mediaData?: any,
  ) {
    const processingStatus =
      status === 'processing' ? 1 : status === 'complete' ? 2 : -1;
    await this.prismaService.mediaAttachment.update({
      where: { id: mediaId },
      data: {
        processing: processingStatus,
        ...mediaData,
      },
    });
  }

  async processImage(
    file: Express.Multer.File,
    thumbnail: Express.Multer.File | undefined,
    thumbnailFilePath: string,
  ) {
    if (thumbnail && thumbnail.mimetype) {
      // User provided a custom thumbnail
      fs.writeFileSync(thumbnailFilePath, thumbnail.buffer);
    } else {
      // Generate a thumbnail from the original file
      await sharp(file.buffer)
        .resize(640, 360, { fit: 'inside' })
        .png() // Specify output format as PNG
        .toFile(thumbnailFilePath);
    }
  }

  validateFile(file: Express.Multer.File) {
    if (!file || !file.mimetype) {
      throw new HttpException(
        { error: 'Validation failed: File is invalid' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const isValidContentType = SUPPORTED_MIME_TYPES.includes(file.mimetype);
    if (!isValidContentType) {
      throw new HttpException(
        { error: 'Validation failed: Unsupported file type' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const isValidSize =
      this.isLargerMediaFormat(file.mimetype) && file.size <= VIDEO_LIMIT
        ? true
        : file.size <= IMAGE_LIMIT;
    if (!isValidSize) {
      throw new HttpException(
        { error: 'Validation failed: File size exceeds limit' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  isLargerMediaFormat(mimeType: string): boolean {
    return (
      VIDEO_MIME_TYPES.includes(mimeType) || AUDIO_MIME_TYPES.includes(mimeType)
    );
  }

  parseFocus(focus: string) {
    if (!focus) return { x: 0, y: 0 };
    const [x, y] = focus.split(',').map(Number);
    return { x, y };
  }

  getTypeEnum(type: string): number {
    // Assuming: 0 - unknown, 1 - image, 2 - video, 3 - gifv, 4 - audio
    switch (type) {
      case 'image':
        return 1;
      case 'video':
        return 2;
      case 'gifv':
        return 3;
      case 'audio':
        return 4;
      default:
        return 0;
    }
  }

  getTypeStr(type: number): string {
    switch (type) {
      case 1:
        return 'image';
      case 2:
        return 'video';
      case 3:
        return 'gifv';
      case 4:
        return 'audio';
      default:
        return '';
    }
  }

  getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'unknown';
  }

  async generateMeta(
    originalFile: Express.Multer.File,
    thumbnailFilePath: string,
    focus: string,
    type: string,
  ) {
    let meta = {};
    const focusPoint = this.parseFocus(focus);

    // Thumbnail metadata
    let smallMeta = {};
    try {
      const thumbnailBuffer = fs.readFileSync(thumbnailFilePath);
      const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();
      smallMeta = {
        width: thumbnailMetadata.width,
        height: thumbnailMetadata.height,
        size: `${thumbnailMetadata.width}x${thumbnailMetadata.height}`,
        aspect: thumbnailMetadata.width / thumbnailMetadata.height,
      };
    } catch (error) {
      console.error('Error extracting thumbnail metadata:', error);
      smallMeta = null;
    }

    if (type === 'image' || type === 'gifv') {
      // Process image or gifv metadata
      try {
        const originalMetadata = await sharp(originalFile.buffer).metadata();
        const originalMeta = {
          width: originalMetadata.width,
          height: originalMetadata.height,
          size: `${originalMetadata.width}x${originalMetadata.height}`,
          aspect: originalMetadata.width / originalMetadata.height,
        };

        meta = {
          focus: focusPoint,
          original: originalMeta,
          small: smallMeta,
        };
      } catch (error) {
        console.error('Error extracting original image metadata:', error);
        meta = {
          focus: focusPoint,
          original: null,
          small: smallMeta,
        };
      }
    } else if (type === 'video') {
      // Process video metadata
      try {
        const videoMeta = await this.getVideoMetadata(originalFile.buffer);
        meta = {
          ...videoMeta,
          small: smallMeta,
          focus: focusPoint,
        };
      } catch (error) {
        console.error('Error extracting video metadata:', error);
        meta = {
          small: smallMeta,
          focus: focusPoint,
        };
      }
    }

    return meta;
  }

  async getVideoMetadata(buffer: Buffer) {
    const writeFile = promisify(fs.writeFile);
    const unlink = promisify(fs.unlink);
    const tempVideoPath = path.join(
      os.tmpdir(),
      `temp_video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    );

    try {
      await writeFile(tempVideoPath, buffer);

      const data = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
        ffmpeg.ffprobe(tempVideoPath, (err, data) => {
          if (err) return reject(err);
          resolve(data);
        });
      });

      const videoStream = data.streams.find(
        (stream) => stream.codec_type === 'video',
      );
      const audioStream = data.streams.find(
        (stream) => stream.codec_type === 'audio',
      );

      if (!videoStream) {
        throw new HttpException(
          { error: 'Video has no video stream' },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const width = videoStream.width;
      const height = videoStream.height;
      if (width * height > MAX_VIDEO_MATRIX_LIMIT) {
        throw new HttpException(
          {
            error: `Videos with dimensions ${width}x${height} are not supported`,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const [numerator, denominator] = videoStream.avg_frame_rate
        .split('/')
        .map(Number);
      const frameRate = numerator / (denominator || 1);
      if (frameRate > MAX_VIDEO_FRAME_RATE) {
        throw new HttpException(
          {
            error: `Videos with frame rate ${frameRate}fps are not supported`,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const meta: VideoMetadata = {
        length: this.formatDuration(data.format.duration),
        duration: data.format.duration,
        fps: frameRate,
        size: `${width}x${height}`,
        width: width,
        height: height,
        aspect: width / height,
        audio_encode: audioStream ? audioStream.codec_name : null,
        audio_bitrate: audioStream ? Number(audioStream.sample_rate) : null,
        audio_channels: audioStream ? audioStream.channels : null,
        original: {
          width: width,
          height: height,
          frame_rate: videoStream.avg_frame_rate,
          duration: data.format.duration,
          bitrate: Number(data.format.bit_rate),
        },
      };

      return meta;
    } finally {
      await unlink(tempVideoPath);
    }
  }

  formatDuration(duration: number): string {
    const minutes = Math.floor(duration / 60);
    const seconds = (duration % 60).toFixed(2);
    return `${minutes}:${seconds.padStart(5, '0')}`;
  }

  async generateBlurhash(imageBuffer: Buffer): Promise<string> {
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: 'inside' })
      .toBuffer({ resolveWithObject: true });

    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  }
}
