import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MediaService } from '../media-attachment/media-attachment.service';
import { Institution } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AccountService } from '../account/account.service';

const postResponseFields = {
  id: true,
  body: true,
  institution: {
    select: {
      id: true,
      category: {
        select: {
          name: true,
        },
      },
      account: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  mediaId: true,
  media: true,
  createdAt: true,
  updatedAt: true,
  comments: true,
  likes: true,
};

@Injectable()
export class PostService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
    private readonly accountService: AccountService,
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
      select: postResponseFields,
    });
    return {
      ...post,
      media,
    };
  }

  async getAllPosts() {
    const posts = await this.prismaService.post.findMany({
      select: postResponseFields,
    });

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
      select: postResponseFields,
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
      select: postResponseFields,
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
    if (!post || post.institution.id !== institutionId) {
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
    if (!post || post.institution.id !== institutionId) {
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
        select: postResponseFields,
      });
    } else {
      updatedPost = await this.prismaService.post.update({
        where: { id: postId },
        data: {
          mediaId,
        },
        select: postResponseFields,
      });
    }

    const media = await this.mediaService.getMediaAttachmentById(mediaId);

    return {
      ...updatedPost,
      media,
    };
  }

  async addComment(postId: number, accountId: number, body: string) {
    if (!body) {
      throw new HttpException(
        'Por favor, insira o texto do comentário.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const donor = await this.accountService.findOneDonor(accountId);
    if (!donor) {
      throw new HttpException(
        'Não foi possível encontrar a conta do doador associada a este ID.',
        HttpStatus.NOT_FOUND,
      );
    }

    const post = await this.findPostById(postId);
    if (!post) {
      throw new HttpException(
        'Não foi possível encontrar o post associado a este ID.',
        HttpStatus.NOT_FOUND,
      );
    }

    const comment = await this.prismaService.comment.create({
      data: {
        body,
        postId: post.id,
        donorId: donor.id,
      },
    });

    return comment;
  }

  async likePost(postId: number, accountId: number) {
    const donor = await this.accountService.findOneDonor(accountId);
    if (!donor) {
      throw new HttpException(
        'Usuário doador não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const post = await this.findPostById(postId);
    if (!post) {
      throw new HttpException('Post não encontrado', HttpStatus.NOT_FOUND);
    }

    const existingLike = await this.prismaService.like.findFirst({
      where: { postId, donorId: donor.id },
    });

    if (existingLike) {
      throw new HttpException(
        'Post já curtido pelo usuário',
        HttpStatus.BAD_REQUEST,
      );
    }

    const like = await this.prismaService.like.create({
      data: { postId, donorId: donor.id },
    });

    return like;
  }

  async unlikePost(postId: number, accountId: number) {
    const donor = await this.accountService.findOneDonor(accountId);
    if (!donor) {
      throw new HttpException(
        'Usuário doador não encontrado',
        HttpStatus.NOT_FOUND,
      );
    }

    const existingLike = await this.prismaService.like.findFirst({
      where: { postId, donorId: donor.id },
    });

    if (!existingLike) {
      throw new HttpException(
        'Esse usuário não curtiu este post',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prismaService.like.delete({
      where: { id: existingLike.id },
    });
  }
}
