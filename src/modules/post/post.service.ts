import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MediaService } from '../media-attachment/media-attachment.service';
import { Institution } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PostService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async postPublication(
    caption: string,
    file: Express.Multer.File,
    institutionId: number,
    accountId: number,
  ) {
    if (!file) {
      throw new HttpException(
        'File is required',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!caption) {
      throw new HttpException(
        'Caption is required',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new HttpException(
        'Only image files are allowed for posts',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const mediaAttachment = await this.mediaService.processMedia(file, {
      accountId,
    });

    const mediaId = mediaAttachment.mediaAttachment.id;

    const media = await this.mediaService.getMediaAttachmentById(mediaId);

    const post = await this.prismaService.post.create({
      data: {
        body: caption,
        institutionId,
        mediaId,
      },
    });
    return {
      ...post,
      media,
    };
  }

  async getAllPosts() {
    const posts = await this.prismaService.post.findMany();

    const postsWithMedia = await Promise.all(
      posts.map(async (post) => {
        const media = await this.mediaService.getMediaAttachmentById(
          post.mediaId,
        );
        return {
          ...post,
          media,
        };
      }),
    );

    return postsWithMedia;
  }

  async getPostsByInstitution(institutionId: number) {
    const posts = await this.prismaService.post.findMany({
      where: {
        institutionId,
      },
    });

    const postsWithMedia = await Promise.all(
      posts.map(async (post) => {
        let media = null;
        if (post.mediaId) {
          media = await this.mediaService.getMediaAttachmentById(post.mediaId);
        }

        return {
          ...post,
          media,
        };
      }),
    );

    return postsWithMedia;
  }

  async findInstitutionByAccountId(accountId: number): Promise<Institution> {
    return this.prismaService.institution.findUnique({ where: { accountId } });
  }

  async findPostById(postId: number) {
    return this.prismaService.post.findUnique({
      where: { id: postId },
    });
  }

  async deletePost(postId: number, userId: number) {
    const institution = await this.findInstitutionByAccountId(userId);
    if (!institution) {
      throw new UnauthorizedException(
        'You are not authorized to perform this action.',
      );
    }

    const institutionId = institution.id;

    const post = await this.findPostById(postId);
    if (!post || post.institutionId !== institutionId) {
      throw new UnauthorizedException(
        'You are not authorized to delete this post.',
      );
    }

    await this.prismaService.post.delete({
      where: { id: postId },
    });
  }

  async updatePost(
    postId: number,
    newCaption: string,
    newFile: Express.Multer.File | null,
    userId: number,
  ) {
    const institution = await this.findInstitutionByAccountId(userId);
    if (!institution) {
      throw new UnauthorizedException(
        'You are not authorized to perform this action.',
      );
    }

    const institutionId = institution.id;

    const post = await this.findPostById(postId);
    if (!post || post.institutionId !== institutionId) {
      throw new UnauthorizedException(
        'You are not authorized to update this post.',
      );
    }

    let mediaId = post.mediaId;

    if (newFile) {
      const mediaAttachment = await this.mediaService.processMedia(newFile, {
        accountId: userId,
      });
      mediaId = mediaAttachment.mediaAttachment.id;
    }

    let updatedPost;
    if (newCaption) {
      updatedPost = await this.prismaService.post.update({
        where: { id: postId },
        data: {
          body: newCaption,
          mediaId,
        },
      });
    } else {
      updatedPost = await this.prismaService.post.update({
        where: { id: postId },
        data: {
          mediaId,
        },
      });
    }

    const media = await this.mediaService.getMediaAttachmentById(mediaId);

    return {
      ...updatedPost,
      media,
    };
  }
}
