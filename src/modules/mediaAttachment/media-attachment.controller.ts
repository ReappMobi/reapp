import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaService } from './media-attachment.service';
import { AuthGuard } from '../authentication/authentication.guard';

@Controller('media')
export class MediaAttachmentController {
  constructor(private readonly mediaAttachmentService: MediaService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
      },
    ),
  )
  async uploadMedia(
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] },
    @Body('accountId', ParseIntPipe) accountId: number,
    @Body('description') description: string,
    @Body('focus') focus: string,
    @Res() res,
  ) {
    const file = files.file ? files.file[0] : undefined;
    const thumbnail = files.thumbnail ? files.thumbnail[0] : undefined;

    if (!file) {
      throw new HttpException(
        'File is required',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!accountId) {
      throw new HttpException(
        'Account ID is required',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

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

    const mediaAttachment = await this.mediaAttachmentService.processMedia(
      file,
      thumbnail,
      accountId,
      description,
      focus,
    );

    if (mediaAttachment.isSynchronous) {
      return res.status(200).send(mediaAttachment.mediaAttachment);
    }

    return res.status(202).send(mediaAttachment.mediaAttachment);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getMediaAttachment(@Param('id') id: string, @Req() req, @Res() res) {
    const { mediaResponse, processing } =
      await this.mediaAttachmentService.getMediaAttachmentById(id);
    if (!mediaResponse) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ error: 'Record not found' });
    }

    switch (processing) {
      case 2: // Processing complete
        res.status(HttpStatus.OK).json(mediaResponse);
        return;
      case 0: // Processing not started
      case 1: // Processing in progress
        res.status(HttpStatus.PARTIAL_CONTENT).json(mediaResponse);
        return;
      case -1: // Processing failed
        res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          error: 'There was an error processing the media attachment',
        });
        return;
      default:
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ error: 'Unknown processing status' });
        return;
    }
  }
}
